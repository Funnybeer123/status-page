import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng, makePhotoSvg, makeWav } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can add today's facts, comments, albums, audio, GEDCOM, and merge a duplicate", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("next-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker next",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const ids: Record<string, string> = {};
  await t.test("add people and a duplicate the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
      { key: "dup", displayName: "Rose W." },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    for (const link of [
      { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" },
      { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
    ]) {
      const created = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(link),
      });
      assert.equal(created.status, 200, created.body.error);
    }
  });

  await t.test("record military, immigration, census, burial, and a Cedar Falls home", async () => {
    for (const event of [
      { personId: ids.louis, kind: "military", title: "Louis reported for the county draft board", happenedOn: "1944-09-22", name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" },
      { personId: ids.rose, kind: "immigration", title: "Rose's people came through Galway", happenedOn: "1920-06-01", name: "Galway" },
      { personId: ids.rose, kind: "census", title: "Rose enumerated on the Cedar Falls census", happenedOn: "1950-04-01", name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" },
      { personId: ids.rose, kind: "burial", title: "Rose buried at Fairview", happenedOn: "2008-11-05", name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" },
    ]) {
      const created = await maya.json("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      assert.equal(created.status, 200, created.body.error);
    }
    const home = await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        name: "Market Street rooms",
        locality: "Cedar Falls",
        region: "Iowa",
        startedAt: "1948-01-01",
      }),
    });
    assert.equal(home.status, 200, home.body.error);
  });

  let letterId = "";
  let storyId = "";
  let photoId = "";
  await t.test("upload a letter, story, photo, and oral-history recording", async () => {
    const photo = new FormData();
    photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "market.svg");
    photo.set("title", "Market Street shop window");
    photo.set("capturedAt", "1952-06-14");
    photo.set("personIds", ids.rose);
    const uploaded = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
    assert.equal(uploaded.status, 200, uploaded.body.error);
    photoId = uploaded.body.asset.id;

    const audio = new FormData();
    audio.set("file", new Blob([makeWav()], { type: "audio/wav" }), "helen.wav");
    audio.set("title", "Helen remembering the navy brim");
    audio.set("capturedAt", "2014-04-20");
    audio.set("kind", "audio");
    audio.set("personIds", ids.helen);
    const reel = await maya.json<{ asset: { id: string; kind: string } }>("/api/assets", { method: "POST", body: audio });
    assert.equal(reel.status, 200, reel.body.error);
    assert.equal(reel.body.asset.kind, "audio");

    const scan = makeLetterPng();
    const letter = new FormData();
    letter.set("file", new Blob([scan.bytes], { type: "image/png" }), "rose-letter.png");
    letter.set("title", "Aunt June on how Rose met Louis");
    letter.set("writtenAt", "1952-09-22");
    letter.set("transcript", ROSE_LETTER);
    letter.set("personIds", ids.rose);
    const saved = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(saved.status, 200, saved.body.error);
    letterId = saved.body.document.id;

    const story = await maya.json<{ story: { id: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "The felted navy brim",
        body: "Rose always kept the felted navy brim on a wooden block.",
        recordedAt: "2014-04-20",
        tellerPersonId: ids.helen,
        personIds: [ids.rose, ids.helen],
      }),
    });
    assert.equal(story.status, 200, story.body.error);
    storyId = story.body.story.id;
  });

  await t.test("comments, an album, on this day, the map, and the pedigree", async () => {
    const comment = await maya.json("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: letterId, body: "I still have the navy hatband in the cedar chest." }),
    });
    assert.equal(comment.status, 200, comment.body.error);
    const storyNote = await maya.json("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId, body: "Helen told this at Easter." }),
    });
    assert.equal(storyNote.status, 200, storyNote.body.error);

    const album = await maya.json<{ album: { id: string } }>("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Market Street years", summary: "The shop and the letters." }),
    });
    assert.equal(album.status, 200, album.body.error);
    const added = await maya.json(`/api/albums/${album.body.album.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: photoId }),
    });
    assert.equal(added.status, 200, added.body.error);
    const letterItem = await maya.json(`/api/albums/${album.body.album.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: letterId }),
    });
    assert.equal(letterItem.status, 200, letterItem.body.error);

    const today = await maya.json<{ items: { title: string }[] }>("/api/today?date=2026-09-22");
    assert.equal(today.status, 200, today.body.error);
    assert.ok(today.body.items.some((item) => /draft board|Helen Park|Aunt June/.test(item.title)));

    const places = await maya.json<{ places: { name: string; latitude: number | null }[] }>("/api/places");
    assert.ok(places.body.places.some((place) => place.latitude != null && /Cedar Falls|Market Street/.test(place.name)));

    const pedigree = await maya.json<{ tree: { person: { displayName: string }; parents: { person: { displayName: string } }[] } }>(
      `/api/pedigree?personId=${ids.helen}`,
    );
    assert.equal(pedigree.body.tree.person.displayName, "Helen Park");
    assert.ok(pedigree.body.tree.parents.some((node) => /Rose|Louis/.test(node.person.displayName)));
  });

  await t.test("merge the duplicate, export the archive, and round-trip GEDCOM", async () => {
    const merged = await maya.json<{ person: { id: string; displayName: string } }>("/api/people/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId: ids.rose, dropId: ids.dup }),
    });
    assert.equal(merged.status, 200, merged.body.error);
    const people = await maya.json<{ people: { displayName: string }[] }>("/api/people");
    assert.ok(!people.body.people.some((person) => person.displayName === "Rose W."));
    assert.ok(people.body.people.some((person) => person.displayName === "Rose Whitaker"));

    const exported = await maya.json<{ people: unknown[]; gedcom: string; files: unknown[] }>("/api/export");
    assert.equal(exported.status, 200, exported.body.error);
    assert.ok(exported.body.people.length >= 3);
    assert.match(exported.body.gedcom, /INDI/);

    const gedcom = await maya.request("/api/gedcom");
    const text = await gedcom.text();
    assert.match(text, /0 HEAD/);
    assert.match(text, /Rose/);

    const imported = await maya.json("/api/gedcom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `0 HEAD
0 @I9@ INDI
1 NAME Nora /Park/
1 BIRT
2 DATE 30 JAN 1983
0 TRLR
`,
      }),
    });
    assert.equal(imported.status, 200, imported.body.error);
  });

  await t.test("home, today, activity, map, book, and export pages render", async () => {
    const home = await maya.html("/");
    assert.match(home.text, /Family home|Upcoming family dates/);
    const today = await maya.html("/today");
    assert.match(today.text, /On this day/);
    const activity = await maya.html("/activity");
    assert.match(activity.text, /Activity/);
    assert.match(activity.text, /Rose Whitaker|Market Street|navy brim|commented/);
    const map = await maya.html("/map");
    assert.match(map.text, /Places they lived/);
    const book = await maya.html(`/book?personId=${ids.rose}`);
    assert.match(book.text, /Family book|Rose Whitaker/);
    const tree = await maya.html(`/tree?view=pedigree&personId=${ids.helen}`);
    assert.match(tree.text, /Ancestor chart|Helen Park|Rose Whitaker/);
    const exp = await maya.html("/export");
    assert.match(exp.text, /Whole-archive export/);
    const letterPage = await maya.html(`/letters/${letterId}`);
    assert.match(letterPage.text, /cedar chest|Family comments/);
  });
});
