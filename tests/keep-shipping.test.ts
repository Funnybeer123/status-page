import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng, makePhotoSvg, makePdfLetter } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can flag duplicates, add later facts, restore an archive, and notify family", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("ship-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker keep",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const invite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "contributor" }),
  });
  assert.equal(invite.status, 200, invite.body.error);
  const ned = new ApiClient();
  const nedEmail = uniqueEmail("ship-ned");
  await ned.signup({ name: "Ned Park", email: nedEmail, password: PASSWORD, invite: invite.body.token });
  await ned.signIn(nedEmail, PASSWORD);

  const ids: Record<string, string> = {};
  await t.test("add people including a likely duplicate", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
      { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
      { key: "dup", displayName: "Rose W.", givenName: "Rose", birthDate: "1929-03-08" },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    const dupes = await maya.json<{ pairs: { keepName: string; dropName: string }[] }>("/api/people/duplicates");
    assert.ok(dupes.body.pairs.some((pair) => /Rose/.test(pair.keepName) && /Rose/.test(pair.dropName)));
  });

  await t.test("occupation, education, religion, and a reunion", async () => {
    for (const event of [
      { personId: ids.rose, kind: "occupation", title: "Rose kept the millinery counter", happenedOn: "1948-04-01" },
      { personId: ids.helen, kind: "education", title: "Helen finished Iowa City", happenedOn: "1976-05-15" },
      { personId: ids.rose, kind: "religion", title: "Rose confirmed at St. John's", happenedOn: "1941-04-13" },
      { personId: ids.helen, kind: "reunion", title: "Whitaker cousins at the Grange", happenedOn: "1999-07-04" },
    ]) {
      const created = await maya.json("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      assert.equal(created.status, 200, created.body.error);
    }
  });

  await t.test("memorial, calendar, bulk photos, clipping, recipe, heirloom", async () => {
    const memorial = await maya.html(`/people/${ids.rose}/memorial`);
    assert.match(memorial.text, /In memory|Rose Whitaker/);

    const ics = await maya.request("/api/dates/ics");
    const calendar = await ics.text();
    assert.match(calendar, /BEGIN:VCALENDAR/);
    assert.match(calendar, /Helen Park|Rose Whitaker/);

    const bulk = new FormData();
    bulk.append("files", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "one.svg");
    bulk.append("files", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "two.svg");
    bulk.set("capturedAt", "1952-06-14");
    bulk.set("personIds", ids.rose);
    const uploaded = await maya.json<{ count: number }>("/api/assets/bulk", { method: "POST", body: bulk });
    assert.equal(uploaded.status, 200, uploaded.body.error);
    assert.equal(uploaded.body.count, 2);

    const scan = makeLetterPng();
    const clipping = new FormData();
    clipping.set("file", new Blob([scan.bytes], { type: "image/png" }), "gazette.png");
    clipping.set("title", "Millinery counter notice");
    clipping.set("writtenAt", "1952-06-20");
    clipping.set("transcript", "Rose Whitaker of Market Street fitted the navy brim.");
    clipping.set("personIds", ids.rose);
    const clip = await maya.json<{ document: { id: string; kind: string } }>("/api/clippings", { method: "POST", body: clipping });
    assert.equal(clip.status, 200, clip.body.error);
    assert.equal(clip.body.document.kind, "clipping");

    const recipe = await maya.json<{ recipe: { title: string } }>("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Rose’s Sunday rolls",
        body: "Warm milk, a cake of yeast, and the navy-blue bowl.",
        writtenAt: "1962-01-01",
        personIds: [ids.rose],
      }),
    });
    assert.equal(recipe.status, 200, recipe.body.error);

    const heirloom = await maya.json("/api/heirlooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "The navy hatband", personId: ids.rose, acquiredAt: "1952-06-14" }),
    });
    assert.equal(heirloom.status, 200, heirloom.body.error);
  });

  await t.test("stats, PDF letter pages, notifications, and restore", async () => {
    const stats = await maya.json<{ stats: { people: number; clippings: number; recipes: number; photos: number } }>("/api/stats");
    assert.ok(stats.body.stats.people >= 4);
    assert.ok(stats.body.stats.clippings >= 1);
    assert.ok(stats.body.stats.recipes >= 1);
    assert.ok(stats.body.stats.photos >= 2);

    const pdf = makePdfLetter();
    const letter = new FormData();
    letter.set("file", new Blob([pdf.bytes], { type: "application/pdf" }), "june.pdf");
    letter.set("title", "Aunt June in two pages");
    letter.set("writtenAt", "1952-09-22");
    letter.set("transcript", `${ROSE_LETTER}\n\n--- Page 2 ---\nHelen kept the navy hatband.`);
    letter.set("personIds", ids.rose);
    const saved = await maya.json<{ document: { transcript: string }; pages?: number }>("/api/letters", { method: "POST", body: letter });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.document.transcript, /Page|Helen|navy/);

    const notices = await ned.json<{ notifications: { title: string }[]; unread: number }>("/api/notifications");
    assert.equal(notices.status, 200, notices.body.error);
    assert.ok(notices.body.unread >= 1);
    assert.ok(notices.body.notifications.some((item) => /Rose|rolls|hatband|photographs|clipping|Aunt June/i.test(item.title)));

    const exported = await maya.json<Record<string, unknown>>("/api/export");
    assert.equal(exported.status, 200, exported.body.error);
    const owen = new ApiClient();
    const owenEmail = uniqueEmail("ship-owen");
    await owen.signup({ name: "Owen Park", email: owenEmail, password: PASSWORD, familyName: "Restored Whitaker" });
    await owen.signIn(owenEmail, PASSWORD);
    const restored = await owen.json<{ restored: { people: number } }>("/api/export/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exported.body),
    });
    assert.equal(restored.status, 200, restored.body.error);
    assert.ok(restored.body.restored.people >= 4);
    const people = await owen.json<{ people: { displayName: string }[] }>("/api/people");
    assert.ok(people.body.people.some((person) => person.displayName === "Rose Whitaker"));
  });

  await t.test("new pages render for a relative", async () => {
    const pages = [
      ["/duplicates", /Suggested duplicates|Rose/],
      [`/people/${ids.rose}/memorial`, /Rose Whitaker/],
      ["/clippings", /Newspaper clippings|Millinery/],
      ["/recipes", /Family cookbook|Sunday rolls/],
      ["/stats", /Archive statistics|people/i],
      ["/heirlooms", /Heirlooms|navy hatband/],
      ["/research", /Still to ask/],
      ["/dates", /Download calendar/],
      ["/import", /Restore a Family Lineage archive/],
      ["/archive", /Bulk photographs/],
    ] as const;
    for (const [path, pattern] of pages) {
      const page = await maya.html(path);
      assert.match(page.text, pattern, path);
    }
    const nedHome = await ned.html("/notifications");
    assert.match(nedHome.text, /Notifications|Rose|rolls|hatband|photographs/i);
  });
});
