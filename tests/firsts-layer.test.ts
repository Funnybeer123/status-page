import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg, makeWav } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can keep firsts, envelopes, a vault, and a night quiet home", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("firsts-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker firsts",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("firsts-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, firsts, letters, recipes, and restorations entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "ada", displayName: "Ada Whitaker", givenName: "Ada", familyName: "Whitaker", birthDate: "1901-02-02", deathDate: "1982-05-09" },
      { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
      { key: "blank", displayName: "Cousin Ned", givenName: "Ned", familyName: "Whitaker" },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    for (const rel of [
      { fromPersonId: ids.ada, toPersonId: ids.rose, type: "parent" },
      { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner" },
      { fromPersonId: ids.rose, toPersonId: ids.june, type: "parent" },
    ]) {
      const saved = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rel),
      });
      assert.equal(saved.status, 200, saved.body.error);
    }
    for (const event of [
      { title: "The Cedar Falls bungalow", firstTag: "house", happenedOn: "1948-06-20" },
      { title: "The navy Ford", firstTag: "car", happenedOn: "1950-05-01" },
      { title: "June was born", firstTag: "child", happenedOn: "1956-04-01" },
      { title: "Undated first job", firstTag: "job" },
    ]) {
      const saved = await maya.json<{ event: { id: string } }>("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: ids.rose, kind: "other", ...event }),
      });
      assert.equal(saved.status, 200, saved.body.error);
      if (event.firstTag === "house") ids.house = saved.body.event.id;
    }
    const first = new FormData();
    first.set("title", "Harvest letter");
    first.set("writtenAt", "1947-10-18");
    first.set("transcript", "I danced three times with Samuel Hart from the north farm.");
    first.set("personIds", ids.rose);
    const savedFirst = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
    ids.letter = savedFirst.body.document.id;
    const second = new FormData();
    second.set("title", "Picnic letter");
    second.set("writtenAt", "1961-07-05");
    second.set("transcript", "The cottonwoods held the picnic baskets.");
    second.set("personIds", ids.rose);
    const savedSecond = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: second });
    ids.letter2 = savedSecond.body.document.id;
    const envelopeScan = new FormData();
    envelopeScan.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "envelope.svg");
    envelopeScan.set("title", "Harvest letter envelope");
    const savedEnvelope = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: envelopeScan });
    ids.envelope = savedEnvelope.body.asset.id;
    const dance = new FormData();
    dance.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "dance.svg");
    dance.set("title", "Harvest dance, 1947");
    dance.set("capturedAt", "1947-10-18T20:00:00Z");
    dance.set("personIds", ids.rose);
    const savedDance = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: dance });
    ids.dance = savedDance.body.asset.id;
    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
    picnic.set("title", "Hart picnic, 1961");
    picnic.set("capturedAt", "1961-07-04T16:00:00Z");
    picnic.set("personIds", ids.rose);
    const savedPicnic = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
    ids.picnic = savedPicnic.body.asset.id;
    const cleaned = new FormData();
    cleaned.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic-cleaned.svg");
    cleaned.set("title", "Hart picnic, cleaned");
    const savedCleaned = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: cleaned });
    ids.cleaned = savedCleaned.body.asset.id;
    const spoken = new FormData();
    spoken.set("file", new Blob([makeWav()], { type: "audio/wav" }), "rose.wav");
    spoken.set("title", "Rose, said out loud");
    spoken.set("kind", "audio");
    const savedSpoken = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: spoken });
    ids.spoken = savedSpoken.body.asset.id;
    const holiday = await maya.json<{ record: { id: string } }>("/api/later-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "holiday", title: "Harvest-dance anniversary supper", season: "October" }),
    });
    ids.holiday = holiday.body.record.id;
    const rolls = await maya.json<{ recipe: { id: string } }>("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Sunday rolls",
        body: "Warm milk, a cake of yeast, and the navy-blue bowl.",
        personIds: [ids.rose],
        holidayId: ids.holiday,
      }),
    });
    ids.rolls = rolls.body.recipe.id;
    const soup = await maya.json<{ recipe: { id: string } }>("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Weeknight soup",
        body: "Whatever was left after the harvest.",
        personIds: [ids.blank],
      }),
    });
    ids.soup = soup.body.recipe.id;
    const restore = await maya.json<{ restore: { id: string } }>("/api/restores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Hart picnic, 1961",
        originalId: ids.picnic,
        cleanedId: ids.cleaned,
      }),
    });
    ids.restore = restore.body.restore.id;
  });

  await t.test("a firsts scrapbook page lists the first house, car, and child", async () => {
    const book = await maya.json<{ heading: string; items: { title: string; label: string }[] }>("/api/scrapbook");
    assert.equal(book.status, 200, book.body.error);
    assert.match(book.body.heading, /firsts on the scrapbook/);
    const titles = book.body.items.map((item) => item.title);
    assert.ok(titles.indexOf("The Cedar Falls bungalow") < titles.indexOf("The navy Ford"));
    assert.equal(titles[titles.length - 1], "Undated first job");
    assert.ok(book.body.items.some((item) => item.label === "First house"));
    assert.ok(book.body.items.some((item) => item.label === "First child"));
    const page = await maya.html("/scrapbook");
    assert.match(page.text, /The Cedar Falls bungalow/);
    assert.match(page.text, /First house/);
    const firsts = await maya.html("/firsts");
    assert.match(firsts.text, /firsts-heading/);
    const undated = await maya.json<{ items: { title: string }[] }>("/api/scrapbook/undated");
    assert.ok(undated.body.items.some((item) => item.title === "Undated first job"));
    const leftover = await maya.json<{ people: { displayName: string }[] }>("/api/scrapbook/people");
    assert.ok(leftover.body.people.some((row) => /Louis Whitaker/.test(row.displayName)));
  });

  await t.test("a hand-drawn pedigree can be printed as a poster", async () => {
    const pedigree = await maya.json<{ heading: string; svg: string; hasParents: boolean }>(`/api/pedigree/${ids.rose}`);
    assert.equal(pedigree.status, 200, pedigree.body.error);
    assert.match(pedigree.body.heading, /Hand-drawn pedigree of Rose Whitaker/);
    assert.equal(pedigree.body.hasParents, true);
    assert.match(pedigree.body.svg, /Ada Whitaker/);
    const page = await maya.html(`/people/${ids.rose}/pedigree`);
    assert.match(page.text, /drawn-pedigree/);
    assert.match(page.text, /Ada Whitaker/);
    const poster = await maya.html("/tree/poster");
    assert.match(poster.text, /tree-poster-heading/);
    const missing = await maya.json<{ people: { displayName: string }[] }>("/api/pedigree/missing");
    assert.ok(missing.body.people.some((row) => /Ada Whitaker/.test(row.displayName)));
  });

  await t.test("a letter envelope shows to, from, date, and the scan", async () => {
    const saved = await maya.json<{ line: string; hasEnvelope: boolean }>(`/api/letters/${ids.letter}/envelope`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        envelopeFrom: "Rose Whitaker, Cedar Falls",
        envelopeTo: "Ruth Whitaker",
        envelopeAssetId: ids.envelope,
      }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /Rose Whitaker, Cedar Falls to Ruth Whitaker/);
    assert.equal(saved.body.hasEnvelope, true);
    const page = await maya.html(`/letters/${ids.letter}/envelope`);
    assert.match(page.text, /Rose Whitaker, Cedar Falls/);
    assert.match(page.text, /Ruth Whitaker/);
    assert.match(page.text, /envelope-scan|Harvest letter envelope/);
    const letter = await maya.html(`/letters/${ids.letter}`);
    assert.match(letter.text, /Harvest letter/);
    assert.match(letter.text, /envelope-link|Envelope/);
    const missing = await maya.json<{ letters: { title: string }[] }>("/api/letters/envelopes/missing");
    assert.ok(missing.body.letters.some((letter) => letter.title === "Picnic letter"));
  });

  await t.test("the family password vault is only for owners", async () => {
    const empty = await maya.json<{ heading: string; notes: { title: string }[] }>("/api/vault");
    assert.equal(empty.status, 200, empty.body.error);
    assert.match(empty.body.heading, /empty|0 shared|No shared/i);
    const added = await maya.json<{ note: { title: string } }>("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Ancestry login", body: "Shared family account. Owners only." }),
    });
    assert.equal(added.status, 200, added.body.error);
    assert.equal(added.body.note.title, "Ancestry login");
    const page = await maya.html("/vault");
    assert.match(page.text, /Ancestry login/);
    assert.match(page.text, /Owners only/);
    const blocked = await viewer.json("/api/vault");
    assert.equal(blocked.status, 403);
    assert.match(blocked.body.error || "", /Only an owner can open the family vault/);
    const blockedPost = await viewer.json("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nope", body: "Should not save." }),
    });
    assert.equal(blockedPost.status, 403);
    const notices = await maya.json<{ notifications?: { title?: string }[] }>("/api/notifications");
    assert.equal(notices.status, 200);
    assert.ok(!(notices.body.notifications || []).some((row) => /Ancestry login/.test(row.title || "")));
  });

  await t.test("who still needs a birth date opens the person form", async () => {
    const missing = await maya.json<{ heading: string; people: { id: string; displayName: string }[] }>("/api/births/missing");
    assert.equal(missing.status, 200, missing.body.error);
    assert.ok(missing.body.people.some((row) => /Cousin Ned/.test(row.displayName)));
    const page = await maya.html("/births/missing");
    assert.match(page.text, /Cousin Ned/);
    assert.match(page.text, /birth-date-form/);
    const saved = await maya.json<{ person: { birthDate: string } }>(`/api/people/${ids.blank}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate: "1978-09-12" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    const after = await maya.json<{ people: { displayName: string }[] }>("/api/births/missing");
    assert.ok(!after.body.people.some((row) => /Cousin Ned/.test(row.displayName)));
    const gaps = await maya.html("/missing");
    assert.match(gaps.text, /missing-heading/);
  });

  await t.test("a restoration pair keeps the side-by-side view and adds a slider", async () => {
    const page = await maya.html(`/restores/${ids.restore}`);
    assert.match(page.text, /restore-pair/);
    assert.match(page.text, /restore-slider|Before and after/);
    assert.match(page.text, /Original scan/);
  });

  await t.test("a recipe can be tagged with the holiday it belongs to", async () => {
    const cookbook = await maya.json<{ heading: string; groups: { holiday: string; recipes: { title: string }[] }[] }>(
      "/api/recipes/holidays",
    );
    assert.equal(cookbook.status, 200, cookbook.body.error);
    assert.ok(cookbook.body.groups.some((group) => /Harvest-dance/.test(group.holiday)));
    const page = await maya.html("/recipes");
    assert.match(page.text, /recipes-heading/);
    assert.match(page.text, /Sunday rolls · for Harvest-dance anniversary supper/);
    const holidays = await maya.html("/holidays");
    assert.match(holidays.text, /holidays-heading/);
    const untagged = await maya.json<{ recipes: { title: string }[] }>("/api/recipes/untagged");
    assert.ok(untagged.body.recipes.some((recipe) => recipe.title === "Weeknight soup"));
  });

  await t.test("the soundboard plays short spoken names", async () => {
    const spoken = await maya.json<{ line: string }>(`/api/people/${ids.rose}/spoken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.spoken }),
    });
    assert.equal(spoken.status, 200, spoken.body.error);
    const board = await maya.json<{ heading: string; items: { displayName: string }[] }>("/api/soundboard");
    assert.ok(board.body.items.some((item) => /Rose Whitaker/.test(item.displayName)));
    const page = await maya.html("/soundboard");
    assert.match(page.text, /Rose Whitaker/);
    const spokenPage = await maya.html("/spoken");
    assert.match(spokenPage.text, /spoken-heading/);
    const leftover = await maya.json<{ people: { displayName: string }[] }>("/api/soundboard/missing");
    assert.ok(leftover.body.people.some((row) => /Louis Whitaker/.test(row.displayName)));
  });

  await t.test("a person’s packet exports as a printable PDF booklet", async () => {
    const response = await maya.request(`/api/people/${ids.rose}/booklet`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /pdf/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
    const page = await maya.html(`/people/${ids.rose}/booklet`);
    assert.match(page.text, /Packet booklet for Rose Whitaker/);
    const packet = await maya.html(`/people/${ids.rose}/packet`);
    assert.match(packet.text, /packet-heading/);
    const zip = await maya.request(`/api/people/${ids.rose}/packet`);
    assert.equal(zip.status, 200);
    assert.match(zip.headers.get("content-type") || "", /zip/);
    const missing = await maya.json<{ people: { displayName: string }[] }>("/api/booklets/missing-letters");
    assert.ok(missing.body.people.some((row) => /Louis Whitaker/.test(row.displayName)));
  });

  await t.test("night mode darkens the quiet view without changing the default home", async () => {
    const home = await maya.html("/");
    assert.match(home.text, /dashboard-heading|Family home/);
    assert.match(home.text, /Recent activity|Upcoming family dates/);
    await maya.json("/api/quiet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiet: true }),
    });
    const quietHome = await maya.html("/");
    assert.match(quietHome.text, /The tree and Ask|quiet-home-heading/);
    assert.ok(!/night-quiet-heading/.test(quietHome.text));
    assert.ok(!/Recent activity/.test(quietHome.text));
    const nighted = await maya.json<{ night: boolean; heading: string }>("/api/night", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ night: true }),
    });
    assert.equal(nighted.status, 200, nighted.body.error);
    assert.equal(nighted.body.night, true);
    const nightHome = await maya.html("/");
    assert.match(nightHome.text, /dashboard-heading|Family home/);
    assert.match(nightHome.text, /Night quiet|night-quiet-heading/);
    assert.ok(!/Recent activity/.test(nightHome.text));
    await maya.json("/api/night", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ night: false }),
    });
    await maya.json("/api/quiet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiet: false }),
    });
    const restored = await maya.html("/");
    assert.match(restored.text, /Recent activity|Upcoming family dates/);
    assert.ok(!/night-quiet-heading/.test(restored.text));
  });
});
