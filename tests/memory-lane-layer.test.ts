import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can walk memory lane, fill a crossword, and open the morning digest", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("memory-lane-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker memory-lane",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("memory-lane-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};
  const today = new Date();
  const todayStamp = `${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

  await t.test("people, places, letters, films, and albums entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: `1956-${todayStamp}` },
      { key: "blank", displayName: "Cousin Ned", givenName: "Ned", familyName: "Whitaker" },
      { key: "child", displayName: "Baby Whitaker", givenName: "Baby", familyName: "Whitaker", birthDate: "2020-01-01" },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    const cedar = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" }),
    });
    ids.cedar = cedar.body.place.id;
    const farm = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "North farm", locality: "Cedar Falls", region: "Iowa" }),
    });
    ids.farm = farm.body.place.id;
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        placeId: ids.cedar,
        startedAt: "1929-03-08",
        endedAt: "1948-06-14",
        notes: "Whitaker house on Market Street.",
      }),
    });
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        placeId: ids.farm,
        startedAt: "1948-06-14",
        endedAt: "2008-11-02",
        notes: "After she married she lived on the north farm.",
      }),
    });
    const porch = new FormData();
    porch.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "porch.svg");
    porch.set("title", "Whitaker porch");
    porch.set("capturedAt", "1935-06-01T16:00:00Z");
    porch.set("personIds", ids.rose);
    const savedPorch = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: porch });
    ids.porch = savedPorch.body.asset.id;
    await maya.json("/api/photos/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.porch, placeId: ids.cedar }),
    });
    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
    picnic.set("title", "Hart picnic, 1961");
    picnic.set("capturedAt", "1961-07-04T16:00:00Z");
    const savedPicnic = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
    ids.picnic = savedPicnic.body.asset.id;
    await maya.json("/api/photos/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.picnic, placeId: ids.farm }),
    });
    const dance = new FormData();
    dance.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "dance.svg");
    dance.set("title", "Harvest dance, Grange hall");
    dance.set("capturedAt", "1947-10-18T20:00:00Z");
    const savedDance = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: dance });
    ids.dance = savedDance.body.asset.id;
    const film = new FormData();
    film.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic-film.svg");
    film.set("title", "Picnic home movie, 1961");
    film.set("kind", "video");
    film.set("capturedAt", "1961-07-04T16:30:00Z");
    const savedFilm = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: film });
    ids.film = savedFilm.body.asset.id;
    const oral = new FormData();
    oral.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "oral.svg");
    oral.set("title", "Helen speaking over the picnic reel");
    oral.set("kind", "audio");
    const savedOral = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: oral });
    ids.oral = savedOral.body.asset.id;
    const letter = new FormData();
    letter.set("title", "Harvest letter");
    letter.set("writtenAt", "1947-10-18");
    letter.set("transcript", "The Grange hall held its harvest dance, the cider was too sweet, and he walked her home past the cottonwoods.");
    letter.set("personIds", ids.rose);
    const savedLetter = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    ids.letter = savedLetter.body.document.id;
    const review = new FormData();
    review.set("title", "Ruth to Eleanor, still smudged");
    review.set("writtenAt", "1947-10-22");
    review.set("transcript", "The stamp is hard to read.");
    review.set("needsReview", "true");
    review.set("personIds", ids.rose);
    const savedReview = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: review });
    ids.review = savedReview.body.document.id;
    await maya.json("/api/ocr/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: ids.review, needsReview: true, transcript: "The stamp is hard to read." }),
    });
    const secret = new FormData();
    secret.set("title", "For Lily, not yet");
    secret.set("writtenAt", "1948-10-18");
    secret.set("transcript", "I still have the hatband in the drawer.");
    secret.set("personIds", ids.june);
    const savedSecret = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: secret });
    ids.secret = savedSecret.body.document.id;
    const album = await maya.json<{ album: { id: string } }>("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Harvest years" }),
    });
    ids.album = album.body.album.id;
    await maya.json(`/api/albums/${ids.album}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.picnic }),
    });
    await maya.json("/api/later-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "address",
        personId: ids.june,
        label: "June on Market Street",
        line: "14 Market Street",
        locality: "Cedar Falls",
        region: "Iowa",
      }),
    });
    await maya.json("/api/phone-tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, phone: "319-555-1956", callOrder: 1 }),
    });
    const branch = await maya.json<{ branch: { id: string } }>("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "the Cedar Falls Harts", summary: "The Iowa line", personIds: [ids.rose, ids.june] }),
    });
    ids.branch = branch.body.branch.id;
    await maya.json("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker reunion at the Grange",
        place: "Grange hall",
        happenedOn: new Date().toISOString().slice(0, 10),
        personIds: [ids.june],
      }),
    });
  });

  await t.test("memory lane lists places in the order she lived there, with one photo each", async () => {
    await maya.json("/api/assets/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.porch, personId: ids.rose }),
    });
    const lane = await maya.json<{ heading: string; items: { placeName: string; photoId: string | null; line: string }[] }>(
      `/api/people/${ids.rose}/lane`,
    );
    assert.equal(lane.status, 200, lane.body.error);
    assert.match(lane.body.heading, /Memory lane · Rose Whitaker/);
    assert.equal(lane.body.items[0]?.placeName, "Cedar Falls");
    assert.equal(lane.body.items[1]?.placeName, "North farm");
    assert.ok(lane.body.items[0]?.photoId);
    assert.ok(lane.body.items[1]?.photoId);
    const page = await maya.html(`/people/${ids.rose}/lane`);
    assert.match(page.text, /memory-lane-heading|Memory lane/);
    assert.match(page.text, /Cedar Falls/);
    const person = await maya.html(`/people/${ids.rose}`);
    assert.match(person.text, /memory-lane-link|Memory lane/);
    const leftover = await maya.json<{ people: { displayName: string }[] }>("/api/lanes/missing");
    assert.ok(leftover.body.people.some((row) => /Cousin Ned/.test(row.displayName)));
    const hidden = await viewer.json<{ items: { placeName: string }[] }>(`/api/people/${ids.june}/lane`);
    assert.equal(hidden.body.items?.length || 0, 0);
  });

  await t.test("the family crossword cites letters and leaves the quiz heading alone", async () => {
    const crossword = await maya.json<{ heading: string; clues: { answer: string; href: string }[] }>("/api/crossword");
    assert.equal(crossword.status, 200, crossword.body.error);
    assert.ok(crossword.body.clues.some((clue) => clue.answer === "CIDER"));
    assert.ok(crossword.body.clues.some((clue) => clue.href === `/letters/${ids.letter}`));
    const page = await maya.html("/crossword");
    assert.match(page.text, /crossword-heading|Family crossword/);
    assert.match(page.text, /CIDER/);
    const quiz = await maya.html("/quiz");
    assert.match(quiz.text, /quiz-heading|Family quiz/);
  });

  await t.test("a weather note sits on a dated photo and a letter", async () => {
    const photo = await maya.json<{ line: string }>("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.dance, weather: "A hard frost, then a clear night for the fiddle." }),
    });
    assert.equal(photo.status, 200, photo.body.error);
    assert.match(photo.body.line, /hard frost/);
    const letter = await maya.json<{ line: string }>("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: ids.letter, weather: "The family remembered a hard frost the morning after." }),
    });
    assert.equal(letter.status, 200, letter.body.error);
    const page = await maya.html(`/letters/${ids.letter}`);
    assert.match(page.text, /hard frost/);
    const archive = await maya.html(`/archive/${ids.dance}`);
    assert.match(archive.text, /asset-title|Harvest dance/);
    assert.match(archive.text, /hard frost/);
    const missing = await maya.json<{ items: { title: string }[] }>("/api/weather/missing");
    assert.ok(missing.body.items.some((item) => /Hart picnic/.test(item.title)));
  });

  await t.test("a borrowed-from credit names the other relative’s album", async () => {
    const saved = await maya.json<{ line: string }>("/api/borrowed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.picnic, albumId: ids.album }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /Borrowed from Harvest years/);
    const page = await maya.html(`/archive/${ids.picnic}`);
    assert.match(page.text, /Borrowed from Harvest years/);
    const album = await maya.html(`/albums/${ids.album}`);
    assert.match(album.text, /album-title|Harvest years/);
  });

  await t.test("a silent caption track times oral notes to the film", async () => {
    const caption = await maya.json<{ line: string }>("/api/films/captions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filmId: ids.film,
        seconds: "0:12",
        text: "Mother is cutting Sunday rolls under the cottonwoods.",
        oralAssetId: ids.oral,
      }),
    });
    assert.equal(caption.status, 200, caption.body.error);
    assert.match(caption.body.line, /0:12/);
    const page = await maya.html(`/films/${ids.film}/captions`);
    assert.match(page.text, /film-captions-heading|Silent captions/);
    assert.match(page.text, /Sunday rolls/);
    const films = await maya.html("/films");
    assert.match(films.text, /films-heading/);
    await maya.json("/api/films/moments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.film, seconds: 83, title: "How they met" }),
    });
    const leftover = await maya.json<{ films: { title: string }[] }>("/api/films/captions/missing");
    assert.ok(!leftover.body.films.some((film) => /Picnic home movie/.test(film.title)));
  });

  await t.test("the printable address book lists living relatives", async () => {
    const book = await maya.json<{ heading: string; items: { displayName: string; printed: string }[] }>("/api/addresses/book");
    assert.equal(book.status, 200, book.body.error);
    assert.ok(book.body.items.some((row) => /June Whitaker/.test(row.displayName) && /14 Market Street/.test(row.printed)));
    assert.ok(!book.body.items.some((row) => /Rose Whitaker/.test(row.displayName)));
    const page = await maya.html("/addresses/book");
    assert.match(page.text, /address-book-heading|Address book/);
    const directory = await maya.html("/directory");
    assert.match(directory.text, /directory-heading/);
    const streets = await maya.html("/addresses");
    assert.match(streets.text, /addresses-heading/);
    const hidden = await viewer.json<{ items: { displayName: string }[] }>("/api/addresses/book");
    assert.ok(!hidden.body.items.some((row) => /Baby Whitaker/.test(row.displayName)));
    const leftover = await maya.json<{ people: { displayName: string }[] }>("/api/addresses/book/missing");
    assert.ok(leftover.body.people.some((row) => /Cousin Ned/.test(row.displayName)));
  });

  await t.test("a kept-secret date hides a letter until that day", async () => {
    const saved = await maya.json<{ line: string }>("/api/secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: ids.secret, secretUntil: "2030-01-01" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /Kept secret until 2030-01-01/);
    const page = await maya.html(`/letters/${ids.secret}`);
    assert.match(page.text, /Kept secret until 2030-01-01/);
    assert.ok(!/hatband in the drawer/.test(page.text));
    assert.match(page.text, /stays closed/);
    await maya.json("/api/secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: ids.letter, secretUntil: "1948-10-18" }),
    });
    const open = await maya.html(`/letters/${ids.letter}`);
    assert.match(open.text, /cider was too sweet/);
    const journal = await maya.json<{ entry: { id: string } }>("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "What I have not said yet", body: "The hatband is still in the cedar drawer." }),
    });
    await maya.json("/api/secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journalId: journal.body.entry.id, secretUntil: "2030-01-01" }),
    });
    const journalPage = await maya.html("/journal");
    assert.match(journalPage.text, /journal-heading/);
    assert.match(journalPage.text, /Kept secret until 2030-01-01/);
    const locked = await maya.json<{ items: { title: string }[] }>("/api/secrets/locked");
    assert.ok(locked.body.items.some((item) => /For Lily, not yet/.test(item.title)));
    const notices = await maya.json<{ notifications?: { title?: string }[] }>("/api/notifications");
    assert.ok(!(notices.body.notifications || []).some((row) => /hatband/.test(row.title || "")));
  });

  await t.test("branch colors make a legend without rewriting the tree heading", async () => {
    const colored = await maya.json<{ line: string }>("/api/branches/color", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: ids.branch, color: "#4d5b3c" }),
    });
    assert.equal(colored.status, 200, colored.body.error);
    assert.match(colored.body.line, /#4d5b3c/);
    const legend = await maya.html("/branches/legend");
    assert.match(legend.text, /branch-legend-heading|#4d5b3c/);
    const tree = await maya.html("/tree");
    assert.match(tree.text, /tree-heading/);
    const branches = await maya.html("/branches");
    assert.match(branches.text, /branches-heading/);
    const leftover = await maya.json<{ branches: { name: string }[] }>("/api/branches/uncolored");
    assert.ok(!leftover.body.branches.some((row) => /Cedar Falls Harts/.test(row.name)));
  });

  await t.test("an OCR confidence score sits on a letter that still needs review", async () => {
    const saved = await maya.json<{ line: string }>("/api/ocr/confidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: ids.review, ocrConfidence: 62 }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /OCR confidence 62/);
    const page = await maya.html(`/letters/${ids.review}`);
    assert.match(page.text, /OCR confidence 62/);
    const ocr = await maya.html("/ocr");
    assert.match(ocr.text, /ocr-heading/);
    assert.match(ocr.text, /OCR confidence 62/);
  });

  await t.test("the start-of-the-day digest lists what is due today", async () => {
    const digest = await maya.json<{ heading: string; subject: string; items: { title: string }[] }>("/api/digest");
    assert.equal(digest.status, 200, digest.body.error);
    assert.ok(digest.body.items.some((item) => /June Whitaker/.test(item.title)));
    assert.ok(digest.body.items.some((item) => /Whitaker reunion/.test(item.title)));
    const page = await maya.html("/digest");
    assert.match(page.text, /digest-heading|Start of the day/);
    assert.match(page.text, /June Whitaker/);
    const tomorrow = await maya.html("/tomorrow");
    assert.match(tomorrow.text, /tomorrow-heading/);
    const moved = await maya.json<{ items: { line: string }[] }>("/api/moved");
    assert.ok(moved.body.items.some((row) => /Rose Whitaker/.test(row.line)));
  });
});
