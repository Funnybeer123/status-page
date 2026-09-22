import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can hunt the archive, pin a letter, and draft the newsletter", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("hunt-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker hunt",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("hunt-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, names, a letter, a photograph, a place, and a marriage entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
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
    for (const rel of [
      { fromPersonId: ids.rose, toPersonId: ids.june, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.june, type: "parent" },
      { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.june, toPersonId: ids.maya, type: "parent" },
    ]) {
      const created = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rel),
      });
      assert.equal(created.status, 200, created.body.error);
    }
    const maiden = await maya.json("/api/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, kind: "maiden", name: "Rose Gable" }),
    });
    assert.equal(maiden.status, 200, maiden.body.error);
    const place = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Cedar Falls",
        locality: "Cedar Falls",
        region: "Iowa",
        latitude: 42.5278,
        longitude: -92.4453,
      }),
    });
    ids.place = place.body.place.id;
    const letter = new FormData();
    letter.set("title", "June to Maya about Rose");
    letter.set("writtenAt", "1952-06-14");
    letter.set("transcript", "I found Rose's first hatband note in the upstairs hall.\n\nKeep it with the cedar chest.");
    letter.set("personIds", ids.rose);
    const savedLetter = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(savedLetter.status, 200, savedLetter.body.error);
    ids.letter = savedLetter.body.document.id;
    const weddingPhoto = new FormData();
    weddingPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "wedding.svg");
    weddingPhoto.set("title", "Rose and Louis married");
    weddingPhoto.set("capturedAt", "1948-06-14T14:00:00Z");
    weddingPhoto.set("personIds", `${ids.rose},${ids.louis}`);
    const savedWedding = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: weddingPhoto });
    ids.weddingPhoto = savedWedding.body.asset.id;
    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
    picnic.set("title", "Hart picnic, 1961");
    picnic.set("capturedAt", "1961-07-04T16:00:00Z");
    picnic.set("personIds", ids.rose);
    const savedPicnic = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
    ids.picnic = savedPicnic.body.asset.id;
    const story = await maya.json<{ story: { id: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Cottonwoods this summer",
        body: "June said the cottonwoods still hold the walk home.",
        tellerPersonId: ids.june,
      }),
    });
    ids.story = story.body.story.id;
    const wedding = await maya.json<{ event: { id: string } }>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        otherPersonId: ids.louis,
        kind: "marriage",
        title: "Rose and Louis married",
        happenedOn: "1948-06-14",
        placeId: ids.place,
      }),
    });
    ids.wedding = wedding.body.event.id;
    const witness = await maya.json("/api/witnesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ids.wedding, personId: ids.june, role: "witness" }),
    });
    assert.equal(witness.status, 200, witness.body.error);
    for (const home of [
      { personId: ids.rose, startedAt: "1948-06-14", endedAt: "2008-11-02" },
      { personId: ids.louis, startedAt: "1946-01-01", endedAt: "2011-01-14" },
    ]) {
      const residence = await maya.json("/api/residences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...home, placeId: ids.place }),
      });
      assert.equal(residence.status, 200, residence.body.error);
    }
  });

  await t.test("a scavenger hunt points to a letter, a photograph, and a place, each cited back to the archive", async () => {
    const hunt = await maya.json<{ hunt: { id: string }; heading: string }>("/api/hunts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Harvest scavenger hunt", notes: "Look in the archive first." }),
    });
    assert.equal(hunt.status, 200, hunt.body.error);
    ids.hunt = hunt.body.hunt.id;
    const letterClue = await maya.json<{ citation: string }>("/api/hunts/clues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        huntId: ids.hunt,
        clue: "Look for the hatband note.",
        targetKind: "letter",
        answer: "June to Maya about Rose",
        citation: "June to Maya about Rose",
        documentId: ids.letter,
      }),
    });
    assert.equal(letterClue.status, 200, letterClue.body.error);
    assert.match(letterClue.body.citation, /Cited from the archive/);
    const photoClue = await maya.json("/api/hunts/clues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        huntId: ids.hunt,
        clue: "Sunday rolls in 1961.",
        targetKind: "photo",
        answer: "Hart picnic, 1961",
        assetId: ids.picnic,
      }),
    });
    assert.equal(photoClue.status, 200, photoClue.body.error);
    const placeClue = await maya.json("/api/hunts/clues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        huntId: ids.hunt,
        clue: "The town they lived in together.",
        targetKind: "place",
        answer: "Cedar Falls",
        placeId: ids.place,
      }),
    });
    assert.equal(placeClue.status, 200, placeClue.body.error);
    const detail = await maya.json<{ heading: string; clues: { citationLine: string; href: string }[] }>(`/api/hunts/${ids.hunt}`);
    assert.match(detail.body.heading, /3 clues/);
    assert.ok(detail.body.clues.some((clue) => /June to Maya about Rose/.test(clue.citationLine) && clue.href.includes(ids.letter)));
    const page = await maya.html(`/hunts/${ids.hunt}`);
    assert.match(page.text, /Look for the hatband note/);
    assert.match(page.text, /Cited from the archive/);
    const blocked = await viewer.json("/api/hunts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "A viewer hunt" }),
    });
    assert.equal(blocked.status, 403);
  });

  await t.test("a letter or story is pinned to one place on the map", async () => {
    const pin = await maya.json<{ line: string }>("/api/place-pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeId: ids.place,
        title: "Harvest letter at Cedar Falls",
        documentId: ids.letter,
      }),
    });
    assert.equal(pin.status, 200, pin.body.error);
    assert.match(pin.body.line, /pinned at Cedar Falls/);
    const storyPin = await maya.json("/api/place-pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeId: ids.place,
        title: "Cottonwoods this summer",
        storyId: ids.story,
      }),
    });
    assert.equal(storyPin.status, 200, storyPin.body.error);
    const list = await maya.json<{ heading: string; pins: { title: string }[] }>("/api/place-pins");
    assert.match(list.body.heading, /pinned on the map/);
    const page = await maya.html("/map/pins");
    assert.match(page.text, /Harvest letter at Cedar Falls/);
    const map = await maya.html("/map");
    assert.match(map.text, /Harvest letter at Cedar Falls/);
  });

  await t.test("siblings are listed in birth order", async () => {
    const list = await maya.json<{ heading: string; siblings: { displayName: string; order: number }[] }>(
      `/api/people/${ids.june}/siblings`,
    );
    assert.match(list.body.heading, /Birth order/);
    assert.equal(list.body.siblings[0]?.displayName, "Helen Whitaker");
    assert.equal(list.body.siblings[1]?.displayName, "June Whitaker");
    const page = await maya.html(`/siblings/${ids.june}`);
    assert.match(page.text, /Helen Whitaker/);
    assert.match(page.text, /June Whitaker/);
  });

  await t.test("the wedding party names the couple, the witnesses, and photographs of that day", async () => {
    const party = await maya.json<{ heading: string; couple: string; witnesses: { line: string }[]; photos: { title?: string }[] }>(
      `/api/weddings/${ids.wedding}`,
    );
    assert.match(party.body.heading, /Wedding party for Rose Whitaker and Louis Whitaker/);
    assert.match(party.body.couple, /Rose Whitaker and Louis Whitaker/);
    assert.ok(party.body.witnesses.some((row) => /June Whitaker/.test(row.line)));
    assert.ok(party.body.photos.some((photo) => /Rose and Louis married/.test(photo.title || "")));
    const page = await maya.html(`/weddings/${ids.wedding}`);
    assert.match(page.text, /June Whitaker/);
    assert.match(page.text, /Rose and Louis married/);
  });

  await t.test("who lived in a place at the same time is listed from overlapping years", async () => {
    const together = await maya.json<{ heading: string; pairs: { line: string }[] }>(`/api/places/${ids.place}/together`);
    assert.match(together.body.heading, /lived at Cedar Falls at the same time/);
    assert.ok(together.body.pairs.some((pair) => /Rose Whitaker/.test(pair.line) && /Louis Whitaker/.test(pair.line)));
    const page = await maya.html(`/places/${ids.place}/together`);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Louis Whitaker/);
  });

  await t.test("a family newsletter draft can be edited before it goes out", async () => {
    const compiled = await maya.json<{ heading: string; draft: { body?: string } | null }>("/api/newsletter?month=2026-09");
    assert.match(compiled.body.heading, /September 2026 family newsletter/);
    const saved = await maya.json<{ heading: string; status: string; draft: { body: string } }>("/api/newsletter/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: "2026-09",
        body: "Dear family — we found the hatband letter this month. Edit this before it goes out.",
      }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.heading, /Draft of the September 2026 family newsletter/);
    assert.match(saved.body.status, /Draft/);
    const again = await maya.json<{ heading: string; draft: { body: string } }>("/api/newsletter?month=2026-09");
    assert.match(again.body.heading, /September 2026 family newsletter/);
    assert.match(again.body.draft.body, /hatband letter/);
    const page = await maya.html("/newsletter/draft?month=2026-09");
    assert.match(page.text, /hatband letter/);
  });

  await t.test("search finds a person by maiden name and also by married name", async () => {
    const maiden = await maya.json<{ hits: { kind: string; title: string; id: string }[] }>("/api/search?q=Gable");
    assert.ok(maiden.body.hits.some((hit) => hit.kind === "name" && /Gable/.test(hit.title)));
    assert.ok(maiden.body.hits.some((hit) => hit.kind === "person" && hit.id === ids.rose && /Rose Whitaker/.test(hit.title)));
    const married = await maya.json<{ hits: { kind: string; id: string; title: string }[] }>("/api/search?q=Whitaker");
    assert.ok(married.body.hits.some((hit) => hit.kind === "person" && hit.id === ids.rose));
    const page = await maya.html("/names");
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Rose Gable|maiden name/);
  });

  await t.test("a research checklist opens with the usual document types already listed", async () => {
    const list = await maya.json<{ heading: string; items: { kind: string; title: string }[] }>("/api/research/checklist");
    assert.equal(list.status, 200, list.body.error);
    assert.match(list.body.heading, /usual document/);
    const kinds = list.body.items.map((item) => item.kind);
    for (const kind of ["birth", "marriage", "death", "census", "obituary", "will", "letter", "photo"]) {
      assert.ok(kinds.includes(kind), kind);
    }
    const marked = await maya.json("/api/research/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "letter", done: true }),
    });
    assert.equal(marked.status, 200, marked.body.error);
    const page = await maya.html("/research/checklist");
    assert.match(page.text, /Birth certificate/);
    assert.match(page.text, /Letter · found/);
    const gaps = await maya.html("/research");
    assert.match(gaps.text, /Still to ask/);
  });

  await t.test("a letter has a large-print read-aloud view, and the family motto sits on the home", async () => {
    const aloud = await maya.json<{ heading: string; paragraphs: string[] }>(`/api/letters/${ids.letter}/aloud`);
    assert.match(aloud.body.heading, /Read aloud: June to Maya about Rose/);
    assert.ok(aloud.body.paragraphs.some((part) => /hatband/.test(part)));
    const page = await maya.html(`/letters/${ids.letter}/aloud`);
    assert.match(page.text, /read-aloud/);
    assert.match(page.text, /hatband/);
    const letter = await maya.html(`/letters/${ids.letter}`);
    assert.match(letter.text, /Read aloud/);
    const room = await maya.html(`/letters/${ids.letter}/room`);
    assert.match(room.text, /reading-room-heading|The letter as a conversation/);
    const motto = await maya.json<{ record: { id: string; text: string } }>("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "motto", text: "Courtesy to the trees", notes: "Said of the cottonwoods." }),
    });
    assert.equal(motto.status, 200, motto.body.error);
    const prefer = await maya.json("/api/mottos/prefer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mottoId: motto.body.record.id }),
    });
    assert.equal(prefer.status, 200, prefer.body.error);
    const home = await maya.html("/");
    assert.match(home.text, /Courtesy to the trees/);
    assert.match(home.text, /home-motto|Family motto/);
  });
});
