import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg, makeWav } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can set a family hour, remember postage, and download a decade", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("family-hour-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker family-hour",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("family-hour-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, letters, photos, oral history, and a reunion entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
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
    await maya.json("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june }),
    });
    const cedar = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" }),
    });
    ids.cedar = cedar.body.place.id;
    const first = new FormData();
    first.set("title", "Harvest letter");
    first.set("writtenAt", "1947-10-18");
    first.set("transcript", "I danced three times with Samuel Hart from the north farm.");
    first.set("personIds", ids.rose);
    const savedFirst = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
    ids.letter = savedFirst.body.document.id;
    await maya.json(`/api/letters/${ids.letter}/postmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stampText: "Cedar Falls, Iowa", postmarkedAt: "1947-10-19" }),
    });
    const prairie = new FormData();
    prairie.set("title", "A note from the prairie");
    prairie.set("writtenAt", "1947-10-20");
    prairie.set("transcript", "The stamp is from a town I cannot place.");
    prairie.set("personIds", ids.rose);
    const savedPrairie = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: prairie });
    ids.prairie = savedPrairie.body.document.id;
    await maya.json(`/api/letters/${ids.prairie}/postmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stampText: "Unknown prairie", postmarkedAt: "1947-10-20" }),
    });
    const bytes = makePhotoSvg();
    const picnic = new FormData();
    picnic.set("file", new Blob([bytes], { type: "image/svg+xml" }), "picnic.svg");
    picnic.set("title", "Hart picnic, 1961");
    picnic.set("capturedAt", "1961-07-04T16:00:00Z");
    picnic.set("personIds", ids.rose);
    const savedPicnic = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
    ids.picnic = savedPicnic.body.asset.id;
    const copy = new FormData();
    copy.set("file", new Blob([bytes], { type: "image/svg+xml" }), "picnic-copy.svg");
    copy.set("title", "Hart picnic, 1961 (copy)");
    copy.set("capturedAt", "1961-07-04T16:00:00Z");
    const savedCopy = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: copy });
    ids.picnicCopy = savedCopy.body.asset.id;
    const junePhoto = new FormData();
    junePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "june.svg");
    junePhoto.set("title", "June on Market Street");
    junePhoto.set("capturedAt", "1984-06-15T14:00:00Z");
    junePhoto.set("personIds", ids.june);
    await maya.json("/api/assets", { method: "POST", body: junePhoto });
    const dance = new FormData();
    dance.set("file", new Blob([Buffer.from("<?xml version=\"1.0\"?><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\" fill=\"#4d5b3c\"/></svg>")], { type: "image/svg+xml" }), "dance.svg");
    dance.set("title", "Harvest dance, Grange hall");
    dance.set("capturedAt", "1947-10-18T20:00:00Z");
    dance.set("personIds", ids.rose);
    const savedDance = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: dance });
    ids.dance = savedDance.body.asset.id;
    const oral = new FormData();
    oral.set("file", new Blob([new Uint8Array(makeWav())], { type: "audio/wav" }), "rose.wav");
    oral.set("kind", "audio");
    oral.set("title", "Rose, said out loud");
    oral.set("capturedAt", "2016-03-12T14:00:00Z");
    const savedOral = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: oral });
    ids.oral = savedOral.body.asset.id;
    const story = await maya.json<{ story: { id: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Cottonwoods this summer",
        body: "June said the cottonwoods still hold the walk home.",
        personIds: [ids.june],
      }),
    });
    ids.story = story.body.story.id;
    const event = await maya.json<{ event: { id: string } }>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        kind: "other",
        title: "Rose hems the harvest dress",
        happenedOn: "1947-09-22",
      }),
    });
    ids.event = event.body.event.id;
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker harvest supper",
        place: "Grange hall",
        happenedOn: "2026-10-18",
        personIds: [ids.june, ids.blank],
      }),
    });
    ids.reunion = reunion.body.reunion.id;
    const emptyReunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "A quiet picnic without seats",
        place: "North farm",
        happenedOn: "2026-07-04",
        personIds: [ids.june],
      }),
    });
    ids.emptyReunion = emptyReunion.body.reunion.id;
    await maya.json(`/api/reunions/${ids.reunion}/seats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, tableName: "Cottonwood", seat: 1 }),
    });
    await maya.json(`/api/reunions/${ids.reunion}/seats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.blank, tableName: "Cottonwood", seat: 2 }),
    });
  });

  await t.test("the family hour counts down to the next reunion or interview", async () => {
    const planned = await maya.json<{ line: string }>("/api/hour/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, scheduledOn: "2026-10-19", notes: "Ask about Sunday rolls." }),
    });
    assert.equal(planned.status, 200, planned.body.error);
    assert.match(planned.body.line, /Interview · June Whitaker/);
    const hour = await maya.html("/hour");
    assert.match(hour.text, /family-hour-heading/);
    assert.match(hour.text, /Whitaker harvest supper/);
    assert.match(hour.text, /family-hour-countdown/);
    const api = await maya.json<{ next: { title: string } }>("/api/hour");
    assert.match(api.body.next.title, /Whitaker harvest supper|Interview/);
    const past = await maya.html("/hour/past");
    assert.match(past.text, /past-hour-heading/);
    assert.match(past.text, /A quiet picnic without seats/);
    const empty = await maya.html("/hour/empty");
    assert.match(empty.text, /empty-hour-heading/);
    const missing = await maya.html("/hour/interviews/missing");
    assert.match(missing.text, /missing-interview-heading/);
    const home = await maya.html("/");
    assert.match(home.text, /dashboard-heading/);
    assert.match(home.text, /home-family-hour/);
  });

  await t.test("a letter keeps the postage cost next to the postmark", async () => {
    const saved = await maya.json<{ line: string }>(`/api/letters/${ids.letter}/postage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postage: "3 cents" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.equal(saved.body.line, "Postage · 3 cents");
    const page = await maya.html("/letters/postage");
    assert.match(page.text, /postage-heading/);
    assert.match(page.text, /Postage · 3 cents/);
    const letter = await maya.html(`/letters/${ids.letter}`);
    assert.match(letter.text, /letter-postage/);
    assert.match(letter.text, /3 cents/);
    const missing = await maya.html("/letters/postage/missing");
    assert.match(missing.text, /missing-postage-heading/);
    assert.match(missing.text, /A note from the prairie/);
    const ledger = await maya.html("/letters/postage/ledger");
    assert.match(ledger.text, /postage-ledger-heading/);
    assert.match(ledger.text, /Harvest letter/);
    const postmarks = await maya.html("/letters/postmarks");
    assert.match(postmarks.text, /postmarks-heading/);
  });

  await t.test("duplicate photographs group the same picnic twice", async () => {
    const page = await maya.html("/photos/duplicates");
    assert.match(page.text, /photo-duplicates-heading/);
    assert.match(page.text, /Hart picnic, 1961/);
    const api = await maya.json<{ groups: { reason: string; items: { title: string }[] }[] }>("/api/photos/duplicates");
    assert.ok(api.body.groups.some((group) => group.items.length >= 2));
    const empty = await maya.html("/photos/duplicates/empty");
    assert.match(empty.text, /empty-photo-duplicates-heading/);
    const people = await maya.html("/duplicates");
    assert.match(people.text, /duplicate/);
  });

  await t.test("spoken by names who talked, not who uploaded", async () => {
    const saved = await maya.json<{ line: string }>("/api/oral/spoken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.oral, personId: ids.rose }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /Spoken by Rose Whitaker/);
    assert.match(saved.body.line, /uploaded by Maya Park/);
    const oral = await maya.html("/oral");
    assert.match(oral.text, /oral-heading/);
    assert.match(oral.text, /Spoken by Rose Whitaker/);
    const credits = await maya.html("/oral/credits");
    assert.match(credits.text, /oral-credits-heading/);
    assert.match(credits.text, /Rose Whitaker/);
    const uncredited = await maya.html("/oral/uncredited");
    assert.match(uncredited.text, /uncredited-oral-heading/);
  });

  await t.test("place cards print one card for each seat", async () => {
    const cards = await maya.html(`/reunions/${ids.reunion}/placecards`);
    assert.match(cards.text, /place-cards-heading/);
    assert.match(cards.text, /June Whitaker/);
    assert.match(cards.text, /Cousin Ned/);
    const seating = await maya.html(`/reunions/${ids.reunion}/seating`);
    assert.match(seating.text, /seating-heading/);
    assert.match(seating.text, /place-cards-link/);
    const reunion = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(reunion.text, /reunion-title/);
    assert.match(reunion.text, /place-cards-link/);
    const missing = await maya.html("/reunions/placecards/missing");
    assert.match(missing.text, /missing-place-cards-heading/);
    assert.match(missing.text, /A quiet picnic without seats/);
  });

  await t.test("the postmark map plots Cedar Falls and leaves the prairie off", async () => {
    const page = await maya.html("/map/postmarks");
    assert.match(page.text, /postmark-map-heading/);
    assert.match(page.text, /Harvest letter/);
    const map = await maya.html("/map");
    assert.match(map.text, /map-heading/);
    const missing = await maya.html("/map/postmarks/missing");
    assert.match(missing.text, /missing-postmark-map-heading/);
    assert.match(missing.text, /A note from the prairie/);
    const towns = await maya.html("/letters/postmarks/towns");
    assert.match(towns.text, /postmark-towns-heading/);
    assert.match(towns.text, /Cedar Falls/);
  });

  await t.test("owners edit the family rules and viewers only read them", async () => {
    const saved = await maya.json<{ heading: string }>("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rulesText: "Viewers do not see a living birth year.\nAsk stays out of keep-out letters.",
      }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    const page = await maya.html("/rules");
    assert.match(page.text, /family-rules-heading/);
    assert.match(page.text, /Ask stays out of keep-out letters/);
    const denied = await viewer.json("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rulesText: "Viewers should not be able to change this." }),
    });
    assert.equal(denied.status, 403);
    const viewerPage = await viewer.html("/rules");
    assert.match(viewerPage.text, /Ask stays out of keep-out letters/);
    assert.doesNotMatch(viewerPage.text, /rules-form/);
    const notices = await maya.json<{ notifications: { title?: string; body?: string }[] }>("/api/notifications");
    const blob = JSON.stringify(notices.body.notifications);
    assert.doesNotMatch(blob, /Ask stays out of keep-out letters/);
    const missing = await maya.html("/rules/missing");
    assert.match(missing.text, /missing-rules-heading/);
  });

  await t.test("start-here keeps three steps and shows a progress ring", async () => {
    const start = await maya.json<{ steps: { id: string }[]; percent: number }>("/api/start");
    assert.equal(start.body.steps.length, 3);
    assert.equal(start.body.percent, 100);
    const page = await maya.html("/start");
    assert.match(page.text, /start-heading/);
    assert.match(page.text, /start-ring/);
    assert.match(page.text, /Start-here progress · 100%/);
    const startSteps = page.text.match(/data-testid="start-steps"[\s\S]*?<\/ol>/);
    assert.ok(startSteps);
    assert.equal((startSteps[0].match(/<li /g) || []).length, 3);
    const incomplete = await maya.html("/start/incomplete");
    assert.match(incomplete.text, /incomplete-start-heading/);
  });

  await t.test("the same day strip on a person page uses today’s month and day", async () => {
    const page = await maya.html(`/people/${ids.rose}`);
    assert.match(page.text, /same-day-strip/);
    assert.match(page.text, /Rose hems the harvest dress/);
    const dedicated = await maya.html(`/people/${ids.rose}/sameday`);
    assert.match(dedicated.text, /same-day-heading/);
    assert.match(dedicated.text, /Rose hems the harvest dress/);
    const family = await maya.html("/people/sameday");
    assert.match(family.text, /family-same-day-heading/);
    assert.match(family.text, /Rose Whitaker/);
    const missing = await maya.html("/sameday/missing");
    assert.match(missing.text, /missing-same-day-heading/);
    assert.match(missing.text, /Cousin Ned/);
    const history = await maya.html(`/people/${ids.rose}/history`);
    assert.match(history.text, /history/);
  });

  await t.test("a decade folder downloads as a zip of photographs", async () => {
    const folder = await maya.html("/archive/folders/1940");
    assert.match(folder.text, /decade-folder-heading/);
    assert.match(folder.text, /decade-zip-link/);
    const zip = await maya.request("/api/archive/folders/1940/zip");
    assert.equal(zip.status, 200);
    assert.match(zip.headers.get("content-type") || "", /zip/);
    const ready = await maya.html("/archive/folders/zips");
    assert.match(ready.text, /decade-zips-heading/);
    const decades = await maya.html("/decades");
    assert.match(decades.text, /decade/);
    const emptyZip = await maya.json("/api/archive/folders/undated/zip");
    assert.equal(emptyZip.status, 400);
  });

  await t.test("viewers can read the new pages and quiet start-here stay the same", async () => {
    const hour = await viewer.html("/hour");
    assert.match(hour.text, /family-hour-heading/);
    const postage = await viewer.html("/letters/postage");
    assert.match(postage.text, /3 cents/);
    const cards = await viewer.html(`/reunions/${ids.reunion}/placecards`);
    assert.match(cards.text, /June Whitaker/);
    const start = await maya.json<{ steps: { id: string }[] }>("/api/start");
    assert.equal(start.body.steps.length, 3);
    const quiet = await maya.html("/quiet");
    assert.match(quiet.text, /quiet/);
  });
});
