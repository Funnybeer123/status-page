import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can save Ask as a story, highlight a letter, and map a cemetery plot", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("ask-save-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker ask-save",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("ask-save-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a letter, work, a cemetery, a reunion, a Bible, and an obituary entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
      { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
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
      { fromPersonId: ids.rose, toPersonId: ids.june, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.june, type: "parent" },
      { fromPersonId: ids.june, toPersonId: ids.maya, type: "parent" },
    ]) {
      const created = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rel),
      });
      assert.equal(created.status, 200, created.body.error);
    }
    const rosePhoto = new FormData();
    rosePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
    rosePhoto.set("title", "Rose at the picnic");
    rosePhoto.set("personIds", ids.rose);
    const savedRose = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: rosePhoto });
    ids.rosePhoto = savedRose.body.asset.id;
    await maya.json("/api/portraits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, assetId: ids.rosePhoto }),
    });
    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
    picnic.set("title", "Hart picnic, 1961");
    picnic.set("personIds", ids.rose);
    const savedPicnic = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
    ids.picnic = savedPicnic.body.asset.id;
    const bibleScan = new FormData();
    bibleScan.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "bible.svg");
    bibleScan.set("title", "Whitaker Bible flyleaf");
    const savedBible = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: bibleScan });
    ids.biblePage = savedBible.body.asset.id;
    const letter = new FormData();
    letter.set("title", "June to Maya about Rose");
    letter.set("writtenAt", "1952-06-14");
    letter.set("transcript", "I found Rose's first hatband note in the upstairs hall.");
    letter.set("personIds", ids.rose);
    const savedLetter = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(savedLetter.status, 200, savedLetter.body.error);
    ids.letter = savedLetter.body.document.id;
    const undated = new FormData();
    undated.set("title", "A note still waiting for a date");
    undated.set("transcript", "We should date this later.");
    undated.set("personIds", ids.june);
    const savedUndated = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: undated });
    ids.undated = savedUndated.body.document.id;
    for (const job of [
      { title: "Milliner", employer: "Market Street", startedOn: "1946-03-01", endedOn: "1952-06-01" },
      { title: "Hat shop keeper", employer: "Market Street", startedOn: "1950-01-01", endedOn: "1956-01-01" },
    ]) {
      const occ = await maya.json("/api/family-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "occupation", personId: ids.rose, place: "Cedar Falls", ...job }),
      });
      assert.equal(occ.status, 200, occ.body.error);
    }
    const cemetery = await maya.json<{ cemetery: { id: string } }>("/api/cemeteries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Fairview Cemetery", locality: "Cedar Falls", region: "Iowa" }),
    });
    ids.cemetery = cemetery.body.cemetery.id;
    const plot = await maya.json<{ plot: { id: string } }>("/api/cemeteries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cemeteryId: ids.cemetery,
        personId: ids.rose,
        plot: "Lot 14",
        x: 42,
        y: 38,
      }),
    });
    assert.equal(plot.status, 200, plot.body.error);
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker reunion at the north farm",
        place: "North farm",
        happenedOn: "2026-07-04",
        personIds: [ids.maya, ids.june],
      }),
    });
    ids.reunion = reunion.body.reunion.id;
    const dish = await maya.json<{ dish: { id: string } }>("/api/reunions/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reunionId: ids.reunion,
        title: "Sunday rolls",
        personId: ids.june,
      }),
    });
    ids.dish = dish.body.dish.id;
    const heirloom = await maya.json<{ heirloom: { id: string } }>("/api/heirlooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Rose's cedar chest", personId: ids.june }),
    });
    ids.heirloom = heirloom.body.heirloom.id;
    const bible = await maya.json<{ record: { id: string } }>("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "bible",
        title: "Whitaker family Bible",
        holderId: ids.june,
        body: "Rose kept the navy hatband in the flyleaf.",
        recordedAt: "1952-06-14",
      }),
    });
    ids.bible = bible.body.record.id;
    const obit = new FormData();
    obit.set("title", "Rose Whitaker of Cedar Falls");
    obit.set("writtenAt", "2008-11-05");
    obit.set("transcript", "Rose Whitaker, who kept the millinery counter, died at home.");
    obit.set("personIds", ids.rose);
    const savedObit = await maya.json<{ document: { id: string } }>("/api/obituaries", { method: "POST", body: obit });
    ids.obit = savedObit.body.document.id;
    const place = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" }),
    });
    ids.place = place.body.place.id;
  });

  await t.test("an Ask answer is saved as an editable family story with the citations kept", async () => {
    const asked = await maya.json<{ conversationId: string; answer: string }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What did June write about the hatband?" }),
    });
    assert.equal(asked.status, 200, asked.body.error);
    ids.conversation = asked.body.conversationId;
    const saved = await maya.json<{ story: { id: string; title: string; citations: { documentId?: string }[] }; heading: string }>(
      "/api/ask/story",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: ids.conversation }),
      },
    );
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.heading, /Saved as a family story/);
    assert.ok(saved.body.story.citations?.some((citation) => citation.documentId === ids.letter));
    ids.story = saved.body.story.id;
    const bookmark = await maya.json("/api/ask/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: ids.conversation, saved: true }),
    });
    assert.equal(bookmark.status, 200, bookmark.body.error);
    const edited = await maya.json<{ story: { body: string; citations: { documentId?: string }[] } }>(`/api/stories/${ids.story}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "June found Rose's hatband note and kept it in the cedar chest." }),
    });
    assert.equal(edited.status, 200, edited.body.error);
    assert.match(edited.body.story.body, /cedar chest/);
    assert.ok(edited.body.story.citations.some((citation) => citation.documentId === ids.letter));
    const page = await maya.html(`/stories/${ids.story}`);
    assert.match(page.text, /cedar chest/);
    assert.match(page.text, /Citations kept|June to Maya about Rose/);
    const list = await maya.html("/ask/stories");
    assert.match(list.text, /Ask answer saved as a story|What did June write/);
    const blocked = await viewer.json("/api/ask/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: ids.conversation }),
    });
    assert.equal(blocked.status, 403);
  });

  await t.test("search words are highlighted inside a letter", async () => {
    const search = await maya.json<{ hits: { href: string; title: string }[] }>("/api/search?q=hatband");
    assert.ok(search.body.hits.some((hit) => hit.href.includes(`/letters/${ids.letter}?q=hatband`)));
    const page = await maya.html(`/letters/${ids.letter}?q=hatband`);
    assert.match(page.text, /match for “hatband”|hatband/);
    assert.match(page.text, /letter-highlight/);
  });

  await t.test("a plot map inside one cemetery names who is buried in each plot", async () => {
    const map = await maya.json<{ heading: string; plots: { name: string; plot?: string | null }[] }>(
      `/api/cemeteries/${ids.cemetery}/map`,
    );
    assert.equal(map.status, 200, map.body.error);
    assert.match(map.body.heading, /plot on the map/);
    assert.ok(map.body.plots.some((plot) => plot.name === "Rose Whitaker" && plot.plot === "Lot 14"));
    const page = await maya.html(`/cemeteries/${ids.cemetery}`);
    assert.match(page.text, /Lot 14/);
    assert.match(page.text, /Rose Whitaker/);
  });

  await t.test("a reunion bring-list names photos, heirlooms, dishes, and who is bringing each", async () => {
    const photo = await maya.json("/api/reunions/bring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reunionId: ids.reunion,
        personId: ids.maya,
        kind: "photo",
        title: "Hart picnic, 1961",
        assetId: ids.picnic,
      }),
    });
    assert.equal(photo.status, 200, photo.body.error);
    const heirloom = await maya.json("/api/reunions/bring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reunionId: ids.reunion,
        personId: ids.june,
        kind: "heirloom",
        title: "Rose's cedar chest",
        heirloomId: ids.heirloom,
      }),
    });
    assert.equal(heirloom.status, 200, heirloom.body.error);
    const list = await maya.json<{ heading: string; items: { title: string; line: string }[] }>(
      `/api/reunions/bring?reunionId=${ids.reunion}`,
    );
    assert.match(list.body.heading, /bring-list/);
    assert.ok(list.body.items.some((item) => /Hart picnic/.test(item.title) && /Maya Park/.test(item.line)));
    assert.ok(list.body.items.some((item) => /cedar chest/.test(item.title)));
    assert.ok(list.body.items.some((item) => /Sunday rolls/.test(item.title) && /June Whitaker/.test(item.line)));
    const page = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(page.text, /Sunday rolls/);
    assert.match(page.text, /Hart picnic, 1961/);
  });

  await t.test("overlapping jobs are called out on an occupation timeline", async () => {
    const timeline = await maya.json<{ overlapHeading: string; overlaps: string[] }>(`/api/people/${ids.rose}/occupations`);
    assert.match(timeline.body.overlapHeading, /overlapping job/);
    assert.ok(timeline.body.overlaps.some((line) => /Milliner/.test(line) && /Hat shop keeper/.test(line)));
    const page = await maya.html(`/people/${ids.rose}/occupations`);
    assert.match(page.text, /Milliner overlaps Hat shop keeper/);
    const family = await maya.html("/occupations/overlaps");
    assert.match(family.text, /Rose Whitaker/);
  });

  await t.test("photographs land on a place’s chronicle", async () => {
    const placed = await maya.json<{ heading: string }>("/api/places/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: ids.place, assetId: ids.picnic }),
    });
    assert.equal(placed.status, 200, placed.body.error);
    const chronicle = await maya.json<{ items: { kind: string; title: string }[]; photosHeading: string }>(
      `/api/chronicle?placeId=${ids.place}`,
    );
    assert.ok(chronicle.body.items.some((item) => item.kind === "photo" && /picnic/i.test(item.title)));
    assert.match(chronicle.body.photosHeading, /photograph on the chronicle/);
    const page = await maya.html(`/places/${ids.place}`);
    assert.match(page.text, /Hart picnic, 1961/);
  });

  await t.test("every letter in the family is listed in date order", async () => {
    const list = await maya.json<{ heading: string; letters: { id: string; title: string }[] }>("/api/letters");
    assert.match(list.body.heading, /letters? in the family, in date order/);
    const datedIndex = list.body.letters.findIndex((letter) => letter.id === ids.letter);
    const undatedIndex = list.body.letters.findIndex((letter) => letter.id === ids.undated);
    assert.ok(datedIndex >= 0 && undatedIndex >= 0);
    assert.ok(datedIndex < undatedIndex);
    const page = await maya.html("/letters");
    assert.match(page.text, /June to Maya about Rose/);
    const missing = await maya.html("/letters/undated");
    assert.match(missing.text, /A note still waiting for a date/);
  });

  await t.test("a whole notice category can be muted, including birthdays and new uploads", async () => {
    const muted = await viewer.json<{ line: string }>("/api/notifications/mute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "upload", muted: true }),
    });
    assert.equal(muted.status, 200, muted.body.error);
    assert.match(muted.body.line, /muted/);
    const extra = new FormData();
    extra.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "extra.svg");
    extra.set("title", "A new picnic upload");
    extra.set("personIds", ids.rose);
    const uploaded = await maya.json("/api/assets", { method: "POST", body: extra });
    assert.equal(uploaded.status, 200, uploaded.body.error);
    const notices = await viewer.json<{ notifications: { title: string }[] }>("/api/notifications");
    assert.equal(
      notices.body.notifications.some((item) => /A new picnic upload/.test(item.title)),
      false,
    );
    const birthday = await viewer.json<{ line: string }>("/api/notifications/mute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "birthday", muted: true }),
    });
    assert.equal(birthday.status, 200, birthday.body.error);
    const dates = await viewer.json<{ reminders: { title: string; kind?: string }[] }>("/api/dates");
    assert.equal(dates.body.reminders.some((item) => /birthday/i.test(item.title)), false);
    const page = await viewer.html("/notifications/muted");
    assert.match(page.text, /Birthdays · muted|New uploads · muted/);
  });

  await t.test("the Bible page image sits on the family Bible record", async () => {
    const attached = await maya.json<{ heading: string }>("/api/bibles/page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bibleId: ids.bible, assetId: ids.biblePage }),
    });
    assert.equal(attached.status, 200, attached.body.error);
    assert.match(attached.body.heading, /Bible page/);
    const page = await maya.html("/bibles");
    assert.match(page.text, /Bible page · Whitaker family Bible/);
    const missing = await maya.html("/bibles/missing");
    assert.match(missing.text, /Every Bible record has its page image/);
  });

  await t.test("an obituary clipping links to that person’s memorial portrait", async () => {
    const linked = await maya.json<{ heading: string; portraitUrl: string | null }>("/api/obituaries/portrait", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: ids.obit, personId: ids.rose }),
    });
    assert.equal(linked.status, 200, linked.body.error);
    assert.match(linked.body.heading, /Memorial portrait · Rose Whitaker/);
    assert.ok(linked.body.portraitUrl);
    const page = await maya.html("/obituaries");
    assert.match(page.text, /Memorial portrait · Rose Whitaker/);
    const memorial = await maya.html(`/people/${ids.rose}/memorial`);
    assert.match(memorial.text, /Rose Whitaker of Cedar Falls/);
    const missing = await maya.html("/obituaries/missing");
    assert.match(missing.text, /Every obituary is linked to a memorial portrait/);
  });
});
