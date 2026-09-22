import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can nest a town, catch a duplicate letter, and start the archive", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("places-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker places",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("places-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
      { key: "june", displayName: "June Whitaker", birthDate: "1956-04-01" },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
      { key: "tom", displayName: "Tom Whitaker", birthDate: "1985-06-12" },
      { key: "agnes", displayName: "Agnes Whitaker", birthDate: "1926-04-08" },
      { key: "peter", displayName: "Peter Whitaker", birthDate: "1988-04-03" },
      { key: "clara", displayName: "Clara Whitaker", birthDate: "1901-02-02", deathDate: "2001-11-02" },
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
      { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" },
      { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.rose, toPersonId: ids.june, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.june, type: "parent" },
      { fromPersonId: ids.helen, toPersonId: ids.maya, type: "parent" },
      { fromPersonId: ids.june, toPersonId: ids.tom, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.peter, type: "adoptive" },
    ]) {
      const created = await maya.json<{ relationship: { id: string; type: string } }>("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rel),
      });
      assert.equal(created.status, 200, created.body.error);
      if (rel.type === "adoptive") ids.adoptive = created.body.relationship.id;
    }
  });

  await t.test("a city inside a county inside a state filters people and events", async () => {
    const us = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "United States", country: "United States", kind: "country" }),
    });
    assert.equal(us.status, 200, us.body.error);
    ids.us = us.body.place.id;
    const iowa = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Iowa", region: "Iowa", country: "United States", kind: "state", parentId: ids.us }),
    });
    assert.equal(iowa.status, 200, iowa.body.error);
    ids.iowa = iowa.body.place.id;
    const county = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Black Hawk County",
        locality: "Black Hawk County",
        region: "Iowa",
        kind: "county",
        parentId: ids.iowa,
      }),
    });
    assert.equal(county.status, 200, county.body.error);
    ids.county = county.body.place.id;
    const city = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Cedar Falls",
        locality: "Cedar Falls",
        region: "Iowa",
        kind: "city",
        parentId: ids.county,
      }),
    });
    assert.equal(city.status, 200, city.body.error);
    ids.city = city.body.place.id;
    const residence = await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        placeId: ids.city,
        startedAt: "1948-06-14",
        notes: "Above the millinery counter",
      }),
    });
    assert.equal(residence.status, 200, residence.body.error);
    const event = await maya.json<{ event: { id: string } }>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        kind: "other",
        title: "Harvest dance at the Grange",
        happenedOn: "1947-10-18",
        placeId: ids.city,
        precision: "circa",
        rangeEnd: "1947-10-31",
      }),
    });
    assert.equal(event.status, 200, event.body.error);
    ids.event = event.body.event.id;

    const filtered = await maya.json<{
      places: { name: string; breadcrumb: string }[];
      people: { displayName: string }[];
      events: { title: string }[];
    }>(`/api/places?within=${ids.iowa}`);
    assert.equal(filtered.status, 200, filtered.body.error);
    assert.ok(filtered.body.places.some((place) => place.name === "Cedar Falls"));
    assert.ok(filtered.body.places.some((place) => /Iowa · Black Hawk County · Cedar Falls/.test(place.breadcrumb)));
    assert.ok(filtered.body.people.some((person) => person.displayName === "Rose Whitaker"));
    assert.ok(filtered.body.events.some((row) => row.title === "Harvest dance at the Grange"));

    const page = await maya.html(`/places?within=${ids.iowa}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /Inside Iowa/);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Harvest dance at the Grange/);
    const cityPage = await maya.html(`/places/${ids.county}`);
    assert.match(cityPage.text, /United States · Iowa · Black Hawk County/);
    assert.match(cityPage.text, /Cedar Falls|Rose Whitaker/);
    const tree = await maya.html("/places/tree");
    assert.match(tree.text, /place-tree|Black Hawk County/);
  });

  await t.test("duplicate letters are the same people and date, or nearly the same text", async () => {
    const first = new FormData();
    first.set("title", "June to Helen, millinery counter");
    first.set("kind", "letter");
    first.set("writtenAt", "1952-06-14");
    first.set("transcript", ROSE_LETTER);
    first.set("personIds", `${ids.rose},${ids.louis}`);
    const saved = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
    assert.equal(saved.status, 200, saved.body.error);
    ids.letter = saved.body.document.id;

    const copy = new FormData();
    copy.set("title", "June to Helen, second typing");
    copy.set("kind", "letter");
    copy.set("writtenAt", "1952-06-14");
    copy.set("transcript", "A later typing of the same day.");
    copy.set("personIds", `${ids.louis},${ids.rose}`);
    const copied = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: copy });
    assert.equal(copied.status, 200, copied.body.error);

    const near = new FormData();
    near.set("title", "Almost the millinery letter");
    near.set("kind", "letter");
    near.set("writtenAt", "1953-01-01");
    near.set("transcript", `${ROSE_LETTER}\nHelen kept the navy hatband.`);
    near.set("personIds", ids.helen);
    const nearly = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: near });
    assert.equal(nearly.status, 200, nearly.body.error);

    const duplicates = await maya.json<{
      duplicates: { reason: string; keepTitle: string }[];
      heading: string;
    }>("/api/letters/duplicates");
    assert.equal(duplicates.status, 200, duplicates.body.error);
    assert.ok(duplicates.body.duplicates.some((pair) => pair.reason === "same people and date"));
    assert.ok(duplicates.body.duplicates.some((pair) => pair.reason === "nearly the same text"));
    const page = await maya.html("/letters/duplicates");
    assert.match(page.text, /same people and date|second typing/);
  });

  await t.test("two handwriting samples sit side by side", async () => {
    const one = await maya.json<{ sample: { id: string } }>("/api/handwriting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, documentId: ids.letter, notes: "The long loops on cider." }),
    });
    assert.equal(one.status, 200, one.body.error);
    ids.handA = one.body.sample.id;
    const two = await maya.json<{ sample: { id: string } }>("/api/handwriting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, documentId: ids.letter, notes: "Short, upright strokes." }),
    });
    assert.equal(two.status, 200, two.body.error);
    ids.handB = two.body.sample.id;
    const page = await maya.html(`/handwriting/compare?a=${ids.handA}&b=${ids.handB}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /Rose Whitaker beside Louis Whitaker|handwriting-compare/);
    assert.match(page.text, /long loops on cider/);
    assert.match(page.text, /Short, upright strokes/);
  });

  await t.test("milestone birthdays name who turns 80, 90, or 100", async () => {
    const api = await maya.json<{ milestones: { displayName: string; age: number }[]; heading: string }>(
      "/api/milestones?year=2026",
    );
    assert.equal(api.status, 200, api.body.error);
    assert.ok(api.body.milestones.some((row) => row.displayName === "Agnes Whitaker" && row.age === 100));
    const page = await maya.html("/milestones?year=2026");
    assert.match(page.text, /Agnes Whitaker turns 100 in 2026/);
  });

  await t.test("the family book downloads as a real PDF", async () => {
    const pdf = await maya.request("/api/book/pdf");
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get("content-type") || "", /pdf/);
    const bytes = Buffer.from(await pdf.arrayBuffer());
    assert.equal(bytes.toString("utf8", 0, 5), "%PDF-");
    assert.match(bytes.toString("utf8"), /Rose Whitaker/);
    const page = await maya.html("/book");
    assert.match(page.text, /book-pdf|Download the family book as PDF/);
  });

  await t.test("a share-link photograph is watermarked family only", async () => {
    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
    picnic.set("title", "Whitaker picnic");
    picnic.set("capturedAt", "1961-07-04");
    picnic.set("personIds", ids.helen);
    const picnicAsset = await maya.json<{ asset: { id: string; storagePath: string } }>("/api/assets", {
      method: "POST",
      body: picnic,
    });
    assert.equal(picnicAsset.status, 200, picnicAsset.body.error);
    ids.picnic = picnicAsset.body.asset.id;
    ids.storage = picnicAsset.body.asset.storagePath;

    const album = await maya.json<{ album: { id: string } }>("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Park picnic album" }),
    });
    assert.equal(album.status, 200, album.body.error);
    await maya.json(`/api/albums/${album.body.album.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.picnic }),
    });
    await maya.json("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.helen, granted: true }),
    });
    const share = await maya.json<{ link: { token: string } }>("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "album", entityId: album.body.album.id }),
    });
    assert.equal(share.status, 200, share.body.error);
    ids.share = share.body.link.token;

    const guest = new ApiClient();
    const shared = await guest.html(`/s/${ids.share}`);
    assert.equal(shared.status, 200);
    assert.match(shared.text, /family only/);
    const media = await guest.request(`/api/media/${ids.storage}`);
    assert.equal(media.status, 200);
    assert.equal(media.headers.get("x-watermark"), "share");
    assert.match(await media.text(), /family only/);
    const signedIn = await maya.request(`/api/media/${ids.storage}`);
    assert.notEqual(signedIn.headers.get("x-watermark"), "share");
  });

  await t.test("the cousin worksheet lays children of siblings together", async () => {
    const page = await maya.html(`/cousins/worksheet?personId=${ids.helen}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /Cousin worksheet · Helen Park/);
    assert.match(page.text, /June Whitaker/);
    assert.match(page.text, /Maya Park/);
    assert.match(page.text, /Tom Whitaker/);
  });

  await t.test("an approximate date is drawn as a range", async () => {
    const page = await maya.html("/dates/ranges");
    assert.equal(page.status, 200);
    assert.match(page.text, /about 1947|1 October 1947/);
    assert.match(page.text, /date-range-bar/);
    const person = await maya.html(`/people/${ids.rose}`);
    assert.match(person.text, /date-range-bar|about 1947/);
  });

  await t.test("an adoption paper is linked to that relationship", async () => {
    const relationshipId = ids.adoptive;
    const paperDoc = new FormData();
    paperDoc.set("title", "Adoption of Peter Whitaker");
    paperDoc.set("kind", "note");
    paperDoc.set("writtenAt", "1994-05-12");
    paperDoc.set("transcript", "Louis adopted Peter after the flood year.");
    paperDoc.set("personIds", `${ids.louis},${ids.peter}`);
    const doc = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: paperDoc });
    assert.equal(doc.status, 200, doc.body.error);
    const paper = await maya.json<{ paper: { id: string } }>("/api/adoptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        relationshipId,
        documentId: doc.body.document.id,
        grantedOn: "1994-05-12",
        notes: "After the flood year.",
      }),
    });
    assert.equal(paper.status, 200, paper.body.error);
    const page = await maya.html("/adoptions");
    assert.match(page.text, /Adoption paper · Peter Whitaker and Louis Whitaker/);
    assert.match(page.text, /After the flood year/);
  });

  await t.test("a new relative claims themselves, adds a story, and uploads a photo", async () => {
    const claim = await maya.json("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.maya }),
    });
    assert.equal(claim.status, 200, claim.body.error);
    const story = await maya.json("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Sunday rolls from Maya",
        body: "Maya still makes the navy-blue bowl of Sunday rolls.",
        recordedAt: "2026-03-12",
        tellerPersonId: ids.maya,
        personIds: [ids.maya],
      }),
    });
    assert.equal(story.status, 200, story.body.error);
    const photo = new FormData();
    photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "maya.svg");
    photo.set("title", "Maya at the picnic");
    photo.set("personIds", ids.maya);
    const uploaded = await maya.json("/api/assets", { method: "POST", body: photo });
    assert.equal(uploaded.status, 200, uploaded.body.error);
    const start = await maya.json<{ heading: string; hasStory: boolean; hasPhoto: boolean; claimed: boolean }>("/api/start");
    assert.equal(start.status, 200, start.body.error);
    assert.equal(start.body.claimed, true);
    assert.equal(start.body.hasStory, true);
    assert.equal(start.body.hasPhoto, true);
    assert.match(start.body.heading, /archive is yours/);
    const page = await maya.html("/start");
    assert.match(page.text, /archive is yours|Start here/);
    assert.match(page.text, /Claim yourself/);
  });

  await t.test("later pages keep the next useful work together", async () => {
    const orphan = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Lost Town", kind: "city" }),
    });
    assert.equal(orphan.status, 200, orphan.body.error);
    const gaps = await maya.html("/places/gaps");
    assert.match(gaps.text, /Lost Town/);
    const anniversaries = await maya.json<{ anniversaries: { displayName: string; years: number }[] }>(
      "/api/anniversaries?year=2026",
    );
    assert.ok(anniversaries.body.anniversaries.some((row) => row.displayName === "Clara Whitaker" && row.years === 25));
    const needed = await maya.json<{ heading: string; withoutStory: { displayName: string }[] }>("/api/needed");
    assert.match(needed.body.heading, /still need/);
    assert.ok(needed.body.withoutStory.some((person) => person.displayName === "Agnes Whitaker"));
    const neededPage = await maya.html("/needed");
    assert.match(neededPage.text, /Agnes Whitaker/);
    const blocked = await viewer.json("/api/adoptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relationshipId: "x" }),
    });
    assert.equal(blocked.status, 403);
  });
});
