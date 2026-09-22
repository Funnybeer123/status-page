import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can print a funeral program, compare two letters, and keep the atlas", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("funeral-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker funeral",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("funeral-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, two letters, a place with GPS, a hunt, and a reunion entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F", notes: "Kept the hatband note in the upstairs hall." },
      { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "ada", displayName: "Ada Whitaker", givenName: "Ada", familyName: "Whitaker", birthDate: "1901-02-02", deathDate: "1982-05-09" },
      { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
      { key: "helen", displayName: "Helen Whitaker", givenName: "Helen", familyName: "Whitaker", birthDate: "1954-09-12" },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    const place = await maya.json<{ place: { id: string; gps?: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Cedar Falls",
        locality: "Cedar Falls",
        region: "Iowa",
        gps: "42.5278 N, 92.4453 W",
      }),
    });
    assert.equal(place.status, 200, place.body.error);
    ids.place = place.body.place.id;
    const creek = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Quiet creek" }),
    });
    ids.creek = creek.body.place.id;
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, placeId: ids.place, startedAt: "1948-06-14", endedAt: "2008-11-02" }),
    });
    const first = new FormData();
    first.set("title", "June to Maya about Rose");
    first.set("writtenAt", "1952-06-14");
    first.set("transcript", "I found Rose's first hatband note in the upstairs hall.\n\nKeep it with the cedar chest.");
    first.set("personIds", ids.rose);
    const savedFirst = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
    ids.letter = savedFirst.body.document.id;
    const second = new FormData();
    second.set("title", "Rose to June about the picnic");
    second.set("writtenAt", "1961-07-05");
    second.set("transcript", "The cottonwoods held the picnic baskets and Louis carved the watermelon.");
    second.set("personIds", ids.rose);
    const savedSecond = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: second });
    ids.letter2 = savedSecond.body.document.id;
    const portrait = new FormData();
    portrait.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
    portrait.set("title", "Rose Whitaker, about 1948");
    portrait.set("capturedAt", "1948-06-14T14:00:00Z");
    portrait.set("personIds", ids.rose);
    const savedPortrait = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: portrait });
    ids.portrait = savedPortrait.body.asset.id;
    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
    picnic.set("title", "Hart picnic, 1961");
    picnic.set("capturedAt", "1961-07-04T16:00:00Z");
    picnic.set("personIds", ids.rose);
    await maya.json("/api/assets", { method: "POST", body: picnic });
    const story = await maya.json<{ story: { id: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Cottonwoods this summer",
        body: "June said the cottonwoods still hold the walk home.",
        tellerPersonId: ids.june,
        personIds: [ids.rose],
      }),
    });
    ids.story = story.body.story.id;
    const hunt = await maya.json<{ hunt: { id: string } }>("/api/hunts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Harvest scavenger hunt" }),
    });
    ids.hunt = hunt.body.hunt.id;
    await maya.json("/api/hunts/clues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        huntId: ids.hunt,
        clue: "Look for the hatband note.",
        targetKind: "letter",
        answer: "June to Maya about Rose",
        documentId: ids.letter,
      }),
    });
    const leftover = await maya.json<{ hunt: { id: string } }>("/api/hunts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Winter attic hunt" }),
    });
    ids.unfinished = leftover.body.hunt.id;
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Hart reunion at the north farm",
        place: "North farm, Cedar Falls",
        happenedOn: "2026-07-04",
        personIds: [ids.maya, ids.june],
      }),
    });
    ids.reunion = reunion.body.reunion.id;
    const bare = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Winter gathering",
        place: "Cedar Falls",
        happenedOn: "2026-12-24",
      }),
    });
    ids.bareReunion = bare.body.reunion.id;
    await maya.json("/api/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        kind: "nickname",
        name: "Rosie",
        notes: "What June still calls her when she opens the cedar chest.",
      }),
    });
    await maya.json("/api/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, kind: "nickname", name: "Junie" }),
    });
  });

  await t.test("a print-ready funeral program has dates, a portrait, and a short life", async () => {
    const program = await maya.json<{ heading: string; dates: string; life: string; portrait: { id: string } | null }>(
      `/api/people/${ids.rose}/funeral`,
    );
    assert.equal(program.status, 200, program.body.error);
    assert.match(program.body.heading, /In memory of Rose Whitaker/);
    assert.match(program.body.dates, /1929 – 2008/);
    assert.match(program.body.life, /hatband|upstairs hall/);
    assert.ok(program.body.portrait);
    const page = await maya.html(`/people/${ids.rose}/funeral`);
    assert.match(page.text, /funeral-heading|In memory of Rose Whitaker/);
    assert.match(page.text, /funeral-portrait|Rose Whitaker, about 1948/);
    const memorial = await maya.html(`/people/${ids.rose}/memorial`);
    assert.match(memorial.text, /memorial-heading/);
    const living = await maya.json(`/api/people/${ids.june}/funeral`);
    assert.equal(living.status, 404);
    const missing = await maya.json<{ heading: string; missing: { displayName: string }[] }>("/api/funerals/missing");
    assert.ok(missing.body.missing.some((row) => /Ada Whitaker/.test(row.displayName)));
    const missingPage = await maya.html("/funerals/missing");
    assert.match(missingPage.text, /Ada Whitaker/);
  });

  await t.test("two letters by the same person sit side by side", async () => {
    const pair = await maya.json<{ heading: string; left: { title: string }; right: { title: string } }>(
      `/api/letters/pair?personId=${ids.rose}`,
    );
    assert.equal(pair.status, 200, pair.body.error);
    assert.match(pair.body.heading, /Two letters by Rose Whitaker/);
    assert.match(pair.body.left.title, /June to Maya about Rose/);
    assert.match(pair.body.right.title, /Rose to June about the picnic/);
    const page = await maya.html(`/letters/pair?personId=${ids.rose}`);
    assert.match(page.text, /hatband/);
    assert.match(page.text, /watermelon/);
    const compare = await maya.html(`/letters/${ids.letter}/compare`);
    assert.equal(compare.status, 404);
    const people = await maya.json<{ heading: string }>("/api/letters/pair/people");
    assert.match(people.body.heading, /1 person has two letters side by side/);
  });

  await t.test("the family atlas lists every place with a summary and a chronicle link", async () => {
    const atlas = await maya.json<{ heading: string; places: { name: string; summary: string; href: string }[] }>("/api/atlas");
    assert.match(atlas.body.heading, /places in the family atlas/);
    const cedar = atlas.body.places.find((place) => place.name === "Cedar Falls");
    assert.ok(cedar);
    assert.match(cedar.summary, /lived here|photograph|dated event|Open the chronicle/);
    assert.equal(cedar.href, `/places/${ids.place}`);
    const page = await maya.html("/atlas");
    assert.match(page.text, /Cedar Falls/);
    assert.match(page.text, `/places/${ids.place}`);
    const places = await maya.html("/places");
    assert.match(places.text, /places-heading/);
    const empty = await maya.json<{ heading: string; places: { name: string }[] }>("/api/atlas/empty");
    assert.ok(empty.body.places.some((place) => place.name === "Quiet creek"));
  });

  await t.test("a badge records who finished the scavenger hunt", async () => {
    const finish = await maya.json<{ line: string; heading: string }>("/api/hunts/" + ids.hunt + "/finish", { method: "POST" });
    assert.equal(finish.status, 200, finish.body.error);
    assert.match(finish.body.line, /Maya Park finished Harvest scavenger hunt/);
    const badges = await maya.json<{ heading: string; badges: { line: string }[] }>("/api/hunts/badges");
    assert.match(badges.body.heading, /1 scavenger hunt badge/);
    const page = await maya.html(`/hunts/${ids.hunt}`);
    assert.match(page.text, /hunt-heading/);
    assert.match(page.text, /Maya Park finished Harvest scavenger hunt/);
    const unfinished = await maya.json<{ heading: string; hunts: { title: string }[] }>("/api/hunts/unfinished");
    assert.ok(unfinished.body.hunts.some((hunt) => hunt.title === "Winter attic hunt"));
    const viewerFinish = await viewer.json(`/api/hunts/${ids.hunt}/finish`, { method: "POST" });
    assert.equal(viewerFinish.status, 200, viewerFinish.body.error);
  });

  await t.test("a printable seating chart seats guests at reunion tables", async () => {
    const seat = await maya.json<{ line: string }>("/api/reunions/" + ids.reunion + "/seats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.maya, tableName: "Cottonwood table", seat: 1 }),
    });
    assert.equal(seat.status, 200, seat.body.error);
    assert.match(seat.body.line, /Maya Park · Cottonwood table, seat 1/);
    await maya.json(`/api/reunions/${ids.reunion}/seats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, tableName: "Cottonwood table", seat: 2 }),
    });
    const chart = await maya.json<{ heading: string }>(`/api/reunions/${ids.reunion}/seats`);
    assert.match(chart.body.heading, /Seating chart for Hart reunion/);
    const page = await maya.html(`/reunions/${ids.reunion}/seating`);
    assert.match(page.text, /Cottonwood table/);
    const reunion = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(reunion.text, /reunion-title/);
    const blocked = await viewer.json(`/api/reunions/${ids.reunion}/seats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, tableName: "Porch" }),
    });
    assert.equal(blocked.status, 403);
    const missing = await maya.json<{ heading: string; reunions: { title: string }[] }>("/api/reunions/seating/missing");
    assert.ok(missing.body.reunions.some((row) => row.title === "Winter gathering"));
  });

  await t.test("the signed-in relative sees what changed since last visit", async () => {
    const first = await maya.json<{ heading: string; firstVisit: boolean; changes: { title: string }[] }>("/api/since-visit");
    assert.equal(first.body.firstVisit, true);
    assert.ok(first.body.changes.length);
    const marked = await maya.json("/api/since-visit", { method: "POST" });
    assert.equal(marked.status, 200, marked.body.error);
    const quiet = await maya.json<{ heading: string; changes: unknown[] }>("/api/since-visit");
    assert.equal(quiet.body.changes.length, 0);
    assert.match(quiet.body.heading, /Nothing has changed since your last visit/);
    const story = await maya.json("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Sunday rolls after the visit", body: "Maya wrote this after marking the visit." }),
    });
    assert.equal(story.status, 200, story.body.error);
    const again = await maya.json<{ heading: string; changes: { title: string }[] }>("/api/since-visit");
    assert.match(again.body.heading, /1 thing changed since your last visit/);
    assert.ok(again.body.changes.some((row) => /Sunday rolls/.test(row.title)));
    const page = await maya.html("/since");
    assert.match(page.text, /Sunday rolls after the visit/);
    const notices = await maya.json<{ notifications?: unknown[] }>("/api/notifications");
    assert.equal(notices.status, 200);
  });

  await t.test("the archive can be sorted by who uploaded", async () => {
    const list = await maya.json<{ heading: string; groups: { name: string; heading: string }[] }>("/api/archive/uploaders");
    assert.match(list.body.heading, /uploaded to the archive/);
    assert.ok(list.body.groups.some((group) => /Maya Park/.test(group.name)));
    const page = await maya.html("/archive/uploaders");
    assert.match(page.text, /Maya Park/);
    const archive = await maya.html("/archive");
    assert.match(archive.text, /Archive/);
  });

  await t.test("Ask fills a life-story draft from letters and stories", async () => {
    const empty = await maya.json("/api/life-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, title: "Draft life story for Louis Whitaker", body: "" }),
    });
    assert.equal(empty.status, 200, empty.body.error);
    const fill = await maya.json<{ heading: string; draft: { body: string }; question: string }>(
      "/api/life-drafts/fill",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: ids.rose }),
      },
    );
    assert.equal(fill.status, 200, fill.body.error);
    assert.match(fill.body.heading, /Draft life story for Rose Whitaker/);
    assert.match(fill.body.question, /letters and stories say about Rose Whitaker/);
    assert.match(fill.body.draft.body, /hatband|cottonwoods|Rose/);
    const page = await maya.html(`/life-drafts/${ids.rose}`);
    assert.match(page.text, /Draft life story for Rose Whitaker/);
    const emptyList = await maya.json<{ heading: string; drafts: { person: { displayName: string } }[] }>("/api/life-drafts/empty");
    assert.ok(emptyList.body.drafts.some((row) => /Louis Whitaker/.test(row.person.displayName)));
    const saved = await maya.json("/api/ask/saved");
    assert.equal(saved.status, 200);
  });

  await t.test("a GPS field on a place is shown on the map", async () => {
    const saved = await maya.json<{ place: { gps: string }; point: { latitude: number; longitude: number } }>(
      "/api/places/gps",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: ids.place, gps: "42.5278 N, 92.4453 W" }),
      },
    );
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.place.gps, /42.5278/);
    assert.equal(saved.body.point.longitude, -92.4453);
    const map = await maya.html("/map");
    assert.match(map.text, /GPS 42.5278 N, 92.4453 W/);
    const place = await maya.html(`/places/${ids.place}`);
    assert.match(place.text, /place-gps|42.5278/);
    const missing = await maya.json<{ heading: string; places: { name: string }[] }>("/api/places/gps/missing");
    assert.ok(missing.body.places.some((row) => row.name === "Quiet creek"));
  });

  await t.test("the family dictionary lists nicknames and how they are used", async () => {
    const dict = await maya.json<{ heading: string; nicknames: { line: string }[] }>("/api/dictionary");
    assert.match(dict.body.heading, /nicknames in the family dictionary/);
    assert.ok(dict.body.nicknames.some((row) => /Rosie/.test(row.line) && /cedar chest/.test(row.line)));
    const page = await maya.html("/dictionary");
    assert.match(page.text, /Rosie/);
    assert.match(page.text, /cedar chest/);
    const nicknames = await maya.html("/nicknames");
    assert.match(nicknames.text, /nicknames-heading/);
    const unused = await maya.json<{ heading: string; nicknames: { name: string }[] }>("/api/dictionary/unused");
    assert.ok(unused.body.nicknames.some((row) => row.name === "Junie"));
    const unusedPage = await maya.html("/dictionary/unused");
    assert.match(unusedPage.text, /Junie/);
  });
});
