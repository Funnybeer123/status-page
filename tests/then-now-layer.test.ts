import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can keep a then-and-now map, a phone tree, and a guest book", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("then-now-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker then-now",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("then-now-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, places, photos, letters, and a reunion entered the way a relative would", async () => {
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
    const place = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Grange hall", locality: "Cedar Falls", region: "Iowa" }),
    });
    assert.equal(place.status, 200, place.body.error);
    ids.place = place.body.place.id;
    const cedar = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" }),
    });
    ids.cedar = cedar.body.place.id;
    const thenPhoto = new FormData();
    thenPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "grange-then.svg");
    thenPhoto.set("title", "Harvest dance, Grange hall");
    thenPhoto.set("capturedAt", "1947-10-18T20:00:00Z");
    thenPhoto.set("placeId", ids.place);
    const savedThen = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: thenPhoto });
    ids.then = savedThen.body.asset.id;
    const nowPhoto = new FormData();
    nowPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "grange-now.svg");
    nowPhoto.set("title", "Grange hall today");
    nowPhoto.set("capturedAt", "2024-06-01T16:00:00Z");
    nowPhoto.set("placeId", ids.place);
    const savedNow = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: nowPhoto });
    ids.now = savedNow.body.asset.id;
    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
    picnic.set("title", "Hart picnic, 1961");
    picnic.set("capturedAt", "1961-07-04T16:00:00Z");
    const savedPicnic = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
    ids.picnic = savedPicnic.body.asset.id;
    const undated = new FormData();
    undated.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "porch.svg");
    undated.set("title", "Undated porch");
    const savedUndated = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: undated });
    ids.undated = savedUndated.body.asset.id;
    const pair = await maya.json<{ pair: { id: string } }>("/api/pairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "The Grange hall, then and now",
        thenAssetId: ids.then,
        nowAssetId: ids.now,
        placeId: ids.place,
      }),
    });
    assert.equal(pair.status, 200, pair.body.error);
    ids.pair = pair.body.pair.id;
    const lostThen = new FormData();
    lostThen.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "lost-then.svg");
    lostThen.set("title", "Unplaced then");
    const savedLostThen = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: lostThen });
    const lostNow = new FormData();
    lostNow.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "lost-now.svg");
    lostNow.set("title", "Unplaced now");
    const savedLostNow = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: lostNow });
    const lostPair = await maya.json<{ pair: { id: string } }>("/api/pairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "A pair still off the map",
        thenAssetId: savedLostThen.body.asset.id,
        nowAssetId: savedLostNow.body.asset.id,
      }),
    });
    ids.lostPair = lostPair.body.pair.id;
    const letter = new FormData();
    letter.set("title", "Harvest letter");
    letter.set("writtenAt", "1947-10-18");
    letter.set("transcript", "I danced three times with Samuel Hart from the north farm.");
    letter.set("personIds", ids.rose);
    const savedLetter = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    ids.letter = savedLetter.body.document.id;
    const picnicLetter = new FormData();
    picnicLetter.set("title", "Picnic letter");
    picnicLetter.set("writtenAt", "1961-07-05");
    picnicLetter.set("transcript", "The cottonwoods held the picnic baskets.");
    picnicLetter.set("personIds", ids.rose);
    const savedPicnicLetter = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: picnicLetter });
    ids.letter2 = savedPicnicLetter.body.document.id;
    const stampOnly = new FormData();
    stampOnly.set("title", "Undated stamped note");
    stampOnly.set("transcript", "The stamp is all we have.");
    stampOnly.set("personIds", ids.june);
    const savedStamp = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: stampOnly });
    ids.stampOnly = savedStamp.body.document.id;
    const event = await maya.json<{ event: { id: string } }>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        kind: "other",
        title: "Harvest dance at the Grange hall",
        happenedOn: "1947-10-12",
        preferred: true,
      }),
    });
    ids.event = event.body.event.id;
    const bare = await maya.json<{ event: { id: string } }>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.louis,
        kind: "other",
        title: "Louis bought the navy Ford",
        happenedOn: "1950-05-01",
        preferred: true,
      }),
    });
    ids.bare = bare.body.event.id;
    await maya.json("/api/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "The harvest dance was 12 October 1947.",
        personId: ids.rose,
        eventId: ids.event,
        documentId: ids.letter,
        quality: "original",
      }),
    });
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.june,
        placeId: ids.cedar,
        startedAt: "1980-06-01",
        notes: "June still lives in Cedar Falls.",
      }),
    });
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        placeId: ids.cedar,
        startedAt: "1948-06-14",
        endedAt: "2008-11-02",
      }),
    });
    const album = await maya.json<{ album: { id: string } }>("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Harvest years", summary: "The dance and the picnic." }),
    });
    ids.album = album.body.album.id;
    await maya.json(`/api/albums/${ids.album}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.then }),
    });
    const emptyAlbum = await maya.json<{ album: { id: string } }>("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Empty tray" }),
    });
    ids.emptyAlbum = emptyAlbum.body.album.id;
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker reunion at the Grange",
        place: "Grange hall, Cedar Falls",
        happenedOn: "2026-07-04",
        personIds: [ids.june, ids.blank],
      }),
    });
    ids.reunion = reunion.body.reunion.id;
    const emptyReunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Picnic without answers",
        place: "Cedar Falls",
        happenedOn: "2027-07-04",
      }),
    });
    ids.emptyReunion = emptyReunion.body.reunion.id;
  });

  await t.test("a then-and-now map shows the same place in two years", async () => {
    const mapped = await maya.json<{ heading: string; items: { title: string; years: string; placeName: string }[] }>(
      "/api/map/then-now",
    );
    assert.equal(mapped.status, 200, mapped.body.error);
    assert.match(mapped.body.heading, /Then and now/);
    assert.ok(mapped.body.items.some((item) => /Grange hall/.test(item.placeName)));
    assert.ok(mapped.body.items.some((item) => /1947 and 2024/.test(item.years)));
    const page = await maya.html("/map/then-now");
    assert.match(page.text, /then-now-heading|Then and now/);
    assert.match(page.text, /The Grange hall, then and now/);
    const familyMap = await maya.html("/map");
    assert.match(familyMap.text, /map-heading/);
    const pairs = await maya.html("/pairs");
    assert.match(pairs.text, /pairs-heading/);
    const missing = await maya.json<{ pairs: { title: string }[] }>("/api/map/then-now/missing");
    assert.ok(missing.body.pairs.some((pair) => /off the map/.test(pair.title)));
  });

  await t.test("the family phone tree lists who to call in order", async () => {
    const first = await maya.json<{ line: string }>("/api/phone-tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, phone: "319-555-1956", callOrder: 1, notes: "Call first." }),
    });
    assert.equal(first.status, 200, first.body.error);
    assert.match(first.body.line, /Call 1 · June Whitaker/);
    await maya.json("/api/phone-tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.blank, phone: "319-555-1978", callOrder: 2 }),
    });
    const tree = await maya.json<{ heading: string; items: { personName: string; callOrder: number }[] }>("/api/phone-tree");
    assert.match(tree.body.heading, /people to call when news spreads/);
    assert.equal(tree.body.items[0]?.personName, "June Whitaker");
    const page = await maya.html("/phone-tree");
    assert.match(page.text, /June Whitaker/);
    assert.match(page.text, /319-555-1956/);
    const leftover = await maya.json<{ people: { displayName: string }[] }>("/api/phone-tree/missing");
    assert.ok(!leftover.body.people.some((row) => /June Whitaker/.test(row.displayName)));
  });

  await t.test("an album prints a watermarked reunion table sheet", async () => {
    const sheet = await maya.json<{ heading: string; watermark: string; sheets: { title: string }[] }>(
      `/api/albums/${ids.album}/table`,
    );
    assert.equal(sheet.status, 200, sheet.body.error);
    assert.match(sheet.body.heading, /Reunion table sheet · Harvest years/);
    assert.match(sheet.body.watermark, /family only/);
    assert.ok(sheet.body.sheets.some((row) => /Harvest dance/.test(row.title)));
    const page = await maya.html(`/albums/${ids.album}/table`);
    assert.match(page.text, /album-table-heading|Reunion table sheet/);
    assert.match(page.text, /family only/);
    const album = await maya.html(`/albums/${ids.album}`);
    assert.match(album.text, /album-title/);
    assert.match(album.text, /album-zip-link|ZIP/);
    const empty = await maya.json<{ heading: string; error?: string }>(`/api/albums/${ids.emptyAlbum}/table`);
    assert.equal(empty.status, 400);
    const leftover = await maya.json<{ albums: { title: string }[] }>("/api/albums/empty-table");
    assert.ok(leftover.body.albums.some((row) => row.title === "Empty tray"));
  });

  await t.test("a preferred date shows a fact confidence score", async () => {
    const dates = await maya.json<{ heading: string; items: { title: string; line: string; score: number }[] }>(
      "/api/dates/preferred",
    );
    assert.equal(dates.status, 200, dates.body.error);
    const harvest = dates.body.items.find((item) => /Harvest dance/.test(item.title));
    assert.ok(harvest);
    assert.equal(harvest?.score, 90);
    assert.match(harvest?.line || "", /Confidence 90 · strong/);
    const page = await maya.html("/dates/preferred");
    assert.match(page.text, /Confidence 90/);
    const quality = await maya.html("/quality");
    assert.match(quality.text, /quality-heading/);
    const bare = await maya.json<{ items: { title: string }[] }>("/api/dates/preferred/bare");
    assert.ok(bare.body.items.some((item) => /navy Ford/.test(item.title)));
  });

  await t.test("a letter stamp stays separate from the written date", async () => {
    const saved = await maya.json<{ line: string; written: string; hasPostmark: boolean }>(
      `/api/letters/${ids.letter}/postmark`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stampText: "Cedar Falls, Iowa", postmarkedAt: "1947-10-19" }),
      },
    );
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /Cedar Falls, Iowa/);
    assert.match(saved.body.written, /18 October 1947/);
    assert.match(saved.body.written, /19 October 1947/);
    const page = await maya.html(`/letters/${ids.letter}`);
    assert.match(page.text, /Harvest letter/);
    assert.match(page.text, /Cedar Falls, Iowa/);
    assert.match(page.text, /cite-this-page|Cite this page/);
    await maya.json(`/api/letters/${ids.stampOnly}/postmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stampText: "Iowa City" }),
    });
    const missing = await maya.json<{ letters: { title: string }[] }>("/api/letters/postmarks/missing");
    assert.ok(missing.body.letters.some((letter) => letter.title === "Picnic letter"));
    const undated = await maya.json<{ letters: { title: string }[] }>("/api/letters/postmarks/undated-written");
    assert.ok(undated.body.letters.some((letter) => letter.title === "Undated stamped note"));
  });

  await t.test("a place page lists people still living there", async () => {
    const living = await maya.json<{ heading: string; people: { displayName: string }[] }>(
      `/api/places/${ids.cedar}/living`,
    );
    assert.equal(living.status, 200, living.body.error);
    assert.ok(living.body.people.some((row) => /June Whitaker/.test(row.displayName)));
    assert.ok(!living.body.people.some((row) => /Rose Whitaker/.test(row.displayName)));
    const page = await maya.html(`/places/${ids.cedar}`);
    assert.match(page.text, /place-heading/);
    assert.match(page.text, /Who lived here/);
    assert.match(page.text, /June Whitaker still lives here/);
    const hidden = await viewer.json<{ people: { displayName: string }[] }>(`/api/places/${ids.cedar}/living`);
    assert.ok(!hidden.body.people.some((row) => /June Whitaker/.test(row.displayName)));
  });

  await t.test("decade folders group the archive by ten-year spans", async () => {
    const folders = await maya.json<{ heading: string; folders: { decade: number | "undated"; heading: string }[] }>(
      "/api/archive/folders",
    );
    assert.equal(folders.status, 200, folders.body.error);
    assert.ok(folders.body.folders.some((folder) => folder.decade === 1940));
    assert.ok(folders.body.folders.some((folder) => folder.decade === 1960));
    const page = await maya.html("/archive/folders");
    assert.match(page.text, /1940s folder/);
    const decades = await maya.html("/decades");
    assert.match(decades.text, /decades-heading/);
    const undated = await maya.json<{ items: { title: string }[] }>("/api/archive/folders/undated");
    assert.ok(undated.body.items.some((item) => item.title === "Undated porch"));
  });

  await t.test("a reunion has a printable RSVP card", async () => {
    const card = await maya.json<{ heading: string; guests: { line: string }[] }>(`/api/reunions/${ids.reunion}/rsvp-card`);
    assert.equal(card.status, 200, card.body.error);
    assert.match(card.body.heading, /RSVP card · Whitaker reunion/);
    assert.ok(card.body.guests.some((guest) => /June Whitaker will be there/.test(guest.line)));
    const page = await maya.html(`/reunions/${ids.reunion}/rsvp-card`);
    assert.match(page.text, /rsvp-card-heading|RSVP card/);
    const reunion = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(reunion.text, /reunion-title/);
    assert.match(reunion.text, /rsvp-toggle|Who’s coming|coming/);
    const leftover = await maya.json<{ reunions: { title: string }[] }>("/api/reunions/rsvp/missing");
    assert.ok(leftover.body.reunions.some((row) => /Picnic without answers/.test(row.title)));
  });

  await t.test("cite this page keeps a stable URL", async () => {
    const letter = await maya.html(`/letters/${ids.letter}`);
    assert.match(letter.text, /cite-this-page/);
    assert.match(letter.text, new RegExp(`/letters/${ids.letter}`));
    assert.match(letter.text, /Accessed/);
    const place = await maya.html(`/places/${ids.cedar}`);
    assert.match(place.text, /Cite this page/);
    assert.match(place.text, new RegExp(`/places/${ids.cedar}`));
  });

  await t.test("visiting relatives can sign the family guest book", async () => {
    const signed = await maya.json<{ note: { line: string } }>("/api/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Maya Park visited and left Sunday rolls." }),
    });
    assert.equal(signed.status, 200, signed.body.error);
    assert.match(signed.body.note.line, /Sunday rolls/);
    const page = await maya.html("/");
    assert.match(page.text, /dashboard-heading|Family home/);
    assert.match(page.text, /Sunday rolls/);
    assert.match(page.text, /home-guestbook/);
    const book = await maya.html("/guestbook");
    assert.match(book.text, /Sunday rolls/);
    const memorial = await maya.html(`/people/${ids.rose}/memorial`);
    assert.match(memorial.text, /memorial-guestbook|guestbook-heading/);
    const notices = await maya.json<{ notifications?: { title?: string }[] }>("/api/notifications");
    assert.equal(notices.status, 200);
    assert.ok(!(notices.body.notifications || []).some((row) => /Sunday rolls/.test(row.title || "")));
    await maya.json("/api/quiet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiet: true }),
    });
    const quietHome = await maya.html("/");
    assert.match(quietHome.text, /dashboard-heading|Family home/);
    assert.ok(!/home-guestbook/.test(quietHome.text));
    assert.ok(!/Sunday rolls/.test(quietHome.text));
    await maya.json("/api/quiet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiet: false }),
    });
  });
});
