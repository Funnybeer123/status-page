import assert from "node:assert/strict";
import { test } from "node:test";
import { zipEntryNames } from "../src/lib/zip";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg, makeWav } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can print an index card, walk a filmstrip, and keep a quiet home", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("card-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker cards",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("card-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, letters, photographs, and residences entered the way a relative would", async () => {
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
    const cedar = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa", gps: "42.5278 N, 92.4453 W" }),
    });
    ids.cedar = cedar.body.place.id;
    const city = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Iowa City", locality: "Iowa City", region: "Iowa", gps: "41.6611 N, 91.5302 W" }),
    });
    ids.city = city.body.place.id;
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, placeId: ids.cedar, startedAt: "1948-06-14", endedAt: "2008-11-02" }),
    });
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, placeId: ids.city, startedAt: "1946-09-01", endedAt: "1950-05-01" }),
    });
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
    const reel = new FormData();
    reel.set("file", new Blob([makeWav()], { type: "audio/wav" }), "picnic.wav");
    reel.set("title", "Picnic reel");
    reel.set("kind", "audio");
    reel.set("capturedAt", "1961-07-04T17:00:00Z");
    reel.set("personIds", ids.rose);
    const savedReel = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: reel });
    ids.reel = savedReel.body.asset.id;
    const later = new FormData();
    later.set("file", new Blob([makeWav()], { type: "audio/wav" }), "later.wav");
    later.set("title", "Later kitchen tape");
    later.set("kind", "audio");
    later.set("capturedAt", "1972-03-12T12:00:00Z");
    const savedLater = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: later });
    ids.later = savedLater.body.asset.id;
    const undatedOral = new FormData();
    undatedOral.set("file", new Blob([makeWav()], { type: "audio/wav" }), "undated.wav");
    undatedOral.set("title", "Undated attic tape");
    undatedOral.set("kind", "audio");
    const savedUndated = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: undatedOral });
    ids.undatedOral = savedUndated.body.asset.id;
    const album = await maya.json<{ album: { id: string } }>("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Harvest years", summary: "The dance and the picnic." }),
    });
    ids.album = album.body.album.id;
    await maya.json(`/api/albums/${ids.album}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.dance }),
    });
    await maya.json(`/api/albums/${ids.album}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.picnic }),
    });
    const emptyAlbum = await maya.json<{ album: { id: string } }>("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Empty tray" }),
    });
    ids.emptyAlbum = emptyAlbum.body.album.id;
    const cited = await maya.json<{ citation: { id: string } }>("/api/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "Rose danced at the harvest dance in 1947.",
        personId: ids.rose,
        documentId: ids.letter,
        assetId: ids.dance,
      }),
    });
    ids.citation = cited.body.citation.id;
    const bare = await maya.json<{ citation: { id: string } }>("/api/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "Cousin Ned still needs a photograph.",
        personId: ids.blank,
      }),
    });
    ids.bare = bare.body.citation.id;
  });

  await t.test("a printable index card lists name, dates, parents, spouses, and children", async () => {
    const card = await maya.json<{ heading: string; card: { parentLine: string; spouseLine: string; childLine: string; dates: string } }>(
      `/api/people/${ids.rose}/card`,
    );
    assert.equal(card.status, 200, card.body.error);
    assert.match(card.body.heading, /Index card for Rose Whitaker/);
    assert.match(card.body.card.dates, /1929 – 2008/);
    assert.match(card.body.card.parentLine, /Ada Whitaker/);
    assert.match(card.body.card.spouseLine, /Louis Whitaker/);
    assert.match(card.body.card.childLine, /June Whitaker/);
    const page = await maya.html(`/people/${ids.rose}/card`);
    assert.match(page.text, /Ada Whitaker/);
    assert.match(page.text, /Louis Whitaker/);
    assert.match(page.text, /June Whitaker/);
    const packet = await maya.html(`/people/${ids.rose}/packet`);
    assert.match(packet.text, /packet-heading/);
    const missing = await maya.json<{ heading: string; people: { displayName: string }[] }>("/api/cards/missing-parents");
    assert.ok(missing.body.people.some((row) => /Ada Whitaker/.test(row.displayName)));
    const undated = await maya.json<{ people: { displayName: string }[] }>("/api/cards/undated");
    assert.ok(undated.body.people.some((row) => /Cousin Ned/.test(row.displayName)));
  });

  await t.test("a filmstrip shows every photograph of one person in date order", async () => {
    const strip = await maya.json<{ heading: string; photos: { title: string }[] }>(`/api/people/${ids.rose}/filmstrip`);
    assert.equal(strip.status, 200, strip.body.error);
    assert.match(strip.body.heading, /2 photographs of Rose Whitaker/);
    assert.equal(strip.body.photos[0]?.title, "Harvest dance, 1947");
    assert.equal(strip.body.photos[1]?.title, "Hart picnic, 1961");
    const page = await maya.html(`/people/${ids.rose}/filmstrip`);
    assert.match(page.text, /Harvest dance, 1947/);
    const portraits = await maya.html("/portraits");
    assert.match(portraits.text, /Portrait/);
    const empty = await maya.json<{ people: { displayName: string }[] }>("/api/filmstrips/empty");
    assert.ok(empty.body.people.some((row) => /Louis Whitaker/.test(row.displayName)));
  });

  await t.test("a letter can be marked as a fragile original and shown on the letter page", async () => {
    const marked = await maya.json<{ label: string; fragile: boolean }>(`/api/letters/${ids.letter}/fragile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragile: true }),
    });
    assert.equal(marked.status, 200, marked.body.error);
    assert.equal(marked.body.label, "Fragile original");
    const page = await maya.html(`/letters/${ids.letter}`);
    assert.match(page.text, /Fragile original/);
    assert.match(page.text, /Harvest letter/);
    const blocked = await viewer.json(`/api/letters/${ids.letter}/fragile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragile: false }),
    });
    assert.equal(blocked.status, 403);
    const list = await maya.json<{ heading: string; letters: { title: string }[] }>("/api/letters/fragile");
    assert.ok(list.body.letters.some((letter) => letter.title === "Harvest letter"));
    const leftover = await maya.json<{ letters: { title: string }[] }>("/api/letters/not-fragile");
    assert.ok(leftover.body.letters.some((letter) => letter.title === "Picnic letter"));
  });

  await t.test("the family playlist lists oral histories in date order", async () => {
    const playlist = await maya.json<{ heading: string; items: { title: string }[] }>("/api/oral/playlist");
    assert.match(playlist.body.heading, /oral histor/);
    assert.equal(playlist.body.items[0]?.title, "Picnic reel");
    assert.equal(playlist.body.items[1]?.title, "Later kitchen tape");
    const page = await maya.html("/oral/playlist");
    assert.match(page.text, /Picnic reel/);
    const oral = await maya.html("/oral");
    assert.match(oral.text, /oral-heading/);
    const undated = await maya.json<{ items: { title: string }[] }>("/api/oral/playlist/undated");
    assert.ok(undated.body.items.some((item) => item.title === "Undated attic tape"));
  });

  await t.test("two people’s residences appear on one map", async () => {
    const compare = await maya.json<{ heading: string; points: { personName: string; placeName: string }[] }>(
      `/api/map/compare?a=${ids.rose}&b=${ids.louis}`,
    );
    assert.equal(compare.status, 200, compare.body.error);
    assert.match(compare.body.heading, /Residences of Rose Whitaker and Louis Whitaker/);
    assert.ok(compare.body.points.some((point) => /Rose/.test(point.personName) && /Cedar Falls/.test(point.placeName)));
    assert.ok(compare.body.points.some((point) => /Louis/.test(point.personName) && /Iowa City/.test(point.placeName)));
    const page = await maya.html(`/map/compare?a=${ids.rose}&b=${ids.louis}`);
    assert.match(page.text, /Cedar Falls/);
    assert.match(page.text, /Iowa City/);
    const map = await maya.html("/map");
    assert.match(map.text, /map-heading/);
    const missing = await maya.json<{ people: { displayName: string }[] }>("/api/map/compare/missing");
    assert.ok(missing.body.people.some((row) => /June Whitaker/.test(row.displayName)));
  });

  await t.test("a thank-you note template follows the last thing a relative added", async () => {
    const thanks = await maya.json<{ heading: string; note: string; line: string }>("/api/thanks");
    assert.equal(thanks.status, 200, thanks.body.error);
    assert.match(thanks.body.heading, /thank-you note/i);
    assert.match(thanks.body.note, /Dear Maya Park/);
    const page = await maya.html("/thanks");
    assert.match(page.text, /Maya Park/);
    const notices = await maya.json<{ notifications?: unknown[] }>("/api/notifications");
    assert.equal(notices.status, 200);
  });

  await t.test("a proof board shows every citation and image for one fact", async () => {
    const board = await maya.json<{ heading: string; images: { title: string }[]; citations: { claim: string }[] }>(
      `/api/proof/${ids.citation}`,
    );
    assert.equal(board.status, 200, board.body.error);
    assert.match(board.body.heading, /Rose danced at the harvest dance/);
    assert.ok(board.body.images.length);
    const page = await maya.html(`/proof/${ids.citation}`);
    assert.match(page.text, /Harvest letter|Harvest dance/);
    const sources = await maya.html("/sources");
    assert.match(sources.text, /sources-heading/);
    const bare = await maya.json<{ facts: { claim: string }[] }>("/api/proof/bare");
    assert.ok(bare.body.facts.some((row) => /Cousin Ned/.test(row.claim)));
  });

  await t.test("one album exports as a ZIP of photographs", async () => {
    const response = await maya.request(`/api/albums/${ids.album}/zip`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /zip/);
    const bytes = Buffer.from(await response.arrayBuffer());
    const names = zipEntryNames(bytes);
    assert.ok(names.some((name) => /dance|picnic|harvest/i.test(name)));
    const empty = await maya.json(`/api/albums/${ids.emptyAlbum}/zip`);
    assert.equal(empty.status, 400);
    const mine = await maya.html("/export/mine");
    assert.ok(mine.status === 200);
    const missing = await maya.json<{ albums: { title: string }[] }>("/api/albums/empty");
    assert.ok(missing.body.albums.some((album) => album.title === "Empty tray"));
    const albumPage = await maya.html(`/albums/${ids.album}`);
    assert.match(albumPage.text, /album-title|Harvest years/);
  });

  await t.test("the generation depth chart counts people at each generation", async () => {
    const chart = await maya.json<{ heading: string; rows: { count: number; label: string }[] }>("/api/generations");
    assert.equal(chart.status, 200, chart.body.error);
    assert.ok(chart.body.rows.length >= 2);
    assert.ok(chart.body.rows.some((row) => row.count >= 1));
    const page = await maya.html("/generations");
    assert.match(page.text, /Generation/);
    const tree = await maya.html("/tree");
    assert.match(tree.text, /tree-heading/);
  });

  await t.test("quiet mode hides activity counts and leaves the tree and Ask", async () => {
    const home = await maya.html("/");
    assert.match(home.text, /dashboard-heading|Family home/);
    assert.match(home.text, /Recent activity|this-week|Upcoming family dates/);
    assert.match(home.text, /nav-notifications|Notices/);
    const quieted = await maya.json<{ quiet: boolean; heading: string }>("/api/quiet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiet: true }),
    });
    assert.equal(quieted.status, 200, quieted.body.error);
    assert.equal(quieted.body.quiet, true);
    const quietHome = await maya.html("/");
    assert.match(quietHome.text, /dashboard-heading|Family home/);
    assert.match(quietHome.text, /The tree and Ask|quiet-home-heading/);
    assert.match(quietHome.text, /quiet-tree|Generation/);
    assert.match(quietHome.text, /quiet-ask|Ask/);
    assert.ok(!/Recent activity/.test(quietHome.text));
    assert.ok(!/nav-notifications/.test(quietHome.text));
    const notices = await maya.json("/api/notifications");
    assert.equal(notices.status, 200);
    await maya.json("/api/quiet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiet: false }),
    });
    const restored = await maya.html("/");
    assert.match(restored.text, /Recent activity|Upcoming family dates/);
  });
});
