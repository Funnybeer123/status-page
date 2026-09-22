import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can hang a memorial wall, compare a letter, and file several leftovers at once", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("memorial-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker memorial",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("memorial-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, work, a school, a letter, leftovers, and a prompt entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
      { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
      { key: "ivy", displayName: "Ivy Park", birthDate: "2015-06-01" },
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
      { fromPersonId: ids.maya, toPersonId: ids.ivy, type: "parent" },
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
    assert.equal(savedRose.status, 200, savedRose.body.error);
    ids.rosePhoto = savedRose.body.asset.id;
    await maya.json("/api/portraits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, assetId: ids.rosePhoto }),
    });
    const original = new FormData();
    original.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "scan.svg");
    original.set("title", "Faded picnic scan");
    original.set("personIds", ids.rose);
    const savedOriginal = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: original });
    ids.original = savedOriginal.body.asset.id;
    const cleaned = new FormData();
    cleaned.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "cleaned.svg");
    cleaned.set("title", "Picnic scan cleaned");
    cleaned.set("personIds", ids.rose);
    const savedCleaned = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: cleaned });
    ids.cleaned = savedCleaned.body.asset.id;
    for (const title of ["Harvest program still in the box", "Prize ribbon still in the box"]) {
      const loose = new FormData();
      loose.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "loose.svg");
      loose.set("title", title);
      const boxed = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: loose });
      assert.equal(boxed.status, 200, boxed.body.error);
      ids[title.includes("program") ? "box1" : "box2"] = boxed.body.asset.id;
    }
    const letter = new FormData();
    letter.set("title", "June to Maya about Rose");
    letter.set("transcript", "I found Rose's first hatband note.");
    letter.set("personIds", ids.rose);
    const savedLetter = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(savedLetter.status, 200, savedLetter.body.error);
    ids.letter = savedLetter.body.document.id;
    const edited = await maya.json(`/api/letters/${ids.letter}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "I found Rose's hatband letter in the upstairs hall." }),
    });
    assert.equal(edited.status, 200, edited.body.error);
    const occ = await maya.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "occupation",
        personId: ids.rose,
        title: "Milliner",
        employer: "Market Street",
        place: "Cedar Falls",
        startedOn: "1946-03-01",
        endedOn: "1952-06-01",
      }),
    });
    assert.equal(occ.status, 200, occ.body.error);
    const school = await maya.json("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        school: "Cedar Falls High",
        place: "Cedar Falls, Iowa",
        startedOn: "1941-09-02",
        endedOn: "1945-05-28",
      }),
    });
    assert.equal(school.status, 200, school.body.error);
    const story = await maya.json("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Sunday rolls from Maya",
        body: "Rose kept the navy hatband on the sideboard.",
        recordedAt: "2026-03-12",
        personIds: [ids.rose],
      }),
    });
    assert.equal(story.status, 200, story.body.error);
    const prompt = await maya.json<{ prompt: { id: string } }>("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "How did Rose keep Sunday dinner?", body: "Tell it the way June told it." }),
    });
    assert.equal(prompt.status, 200, prompt.body.error);
    ids.prompt = prompt.body.prompt.id;
  });

  await t.test("the memorial portrait wall is separate from the living wall", async () => {
    const memorial = await maya.json<{ heading: string; rows: { people: { displayName: string; profileUrl: string | null }[] }[] }>(
      "/api/portraits?wall=memorial",
    );
    assert.equal(memorial.status, 200, memorial.body.error);
    assert.match(memorial.body.heading, /memorial portrait/);
    assert.ok(memorial.body.rows.some((row) => row.people.some((person) => person.displayName === "Rose Whitaker" && person.profileUrl)));
    assert.equal(
      memorial.body.rows.some((row) => row.people.some((person) => person.displayName === "Maya Park")),
      false,
    );
    const living = await maya.json<{ heading: string; rows: { people: { displayName: string }[] }[] }>("/api/portraits?wall=living");
    assert.match(living.body.heading, /living portrait/);
    assert.ok(living.body.rows.some((row) => row.people.some((person) => person.displayName === "Maya Park")));
    assert.equal(
      living.body.rows.some((row) => row.people.some((person) => person.displayName === "Rose Whitaker")),
      false,
    );
    const mixed = await maya.html("/portraits");
    assert.match(mixed.text, /Rose Whitaker/);
    const wall = await maya.html("/portraits/memorial");
    assert.match(wall.text, /Rose Whitaker/);
    assert.match(wall.text, /memorial portrait/);
  });

  await t.test("side-by-side transcripts show the earlier wording next to the current one", async () => {
    const compare = await maya.json<{ heading: string; current: string; earlier: string; edited: boolean }>(
      `/api/letters/${ids.letter}/compare`,
    );
    assert.equal(compare.status, 200, compare.body.error);
    assert.match(compare.body.heading, /Side-by-side/);
    assert.match(compare.body.earlier, /first hatband note/);
    assert.match(compare.body.current, /upstairs hall/);
    const page = await maya.html(`/letters/${ids.letter}`);
    assert.match(page.text, /Current transcript/);
    assert.match(page.text, /Earlier transcript/);
    const list = await maya.html("/letters/edited");
    assert.match(list.text, /June to Maya about Rose/);
  });

  await t.test("one person gets an occupation timeline", async () => {
    const timeline = await maya.json<{ heading: string; lines: string[] }>(`/api/people/${ids.rose}/occupations`);
    assert.equal(timeline.status, 200, timeline.body.error);
    assert.match(timeline.body.heading, /Rose Whitaker/);
    assert.ok(timeline.body.lines.some((line) => /Milliner/.test(line)));
    const page = await maya.html(`/people/${ids.rose}/occupations`);
    assert.match(page.text, /Milliner/);
    await maya.html(`/people/${ids.rose}`);
  });

  await t.test("today’s question is answered as a story, and recently opened people land on the home", async () => {
    const today = await maya.json<{ heading: string; prompt: { id: string; title: string } }>("/api/prompts/today");
    assert.equal(today.status, 200, today.body.error);
    assert.match(today.body.heading, /Today/);
    const answered = await maya.json<{ story: { id: string; title: string } }>("/api/prompts/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promptId: ids.prompt,
        body: "Rose kept the navy hatband on the sideboard and the rolls in the warmer.",
        personId: ids.rose,
      }),
    });
    assert.equal(answered.status, 200, answered.body.error);
    assert.equal(answered.body.story.title, "How did Rose keep Sunday dinner?");
    const story = await maya.html(`/stories/${answered.body.story.id}`);
    assert.match(story.text, /navy hatband/);
    const recents = await maya.json<{ heading: string; lines: string[] }>("/api/recents");
    assert.ok(recents.body.lines.some((line) => /Rose Whitaker/.test(line)));
    const home = await maya.html("/");
    assert.match(home.text, /Today|question|Rose Whitaker/);
    const recentsPage = await maya.html("/recents");
    assert.match(recentsPage.text, /Rose Whitaker/);
  });

  await t.test("schools plot on a map", async () => {
    const map = await maya.json<{ heading: string; lines: string[] }>("/api/schools/map");
    assert.equal(map.status, 200, map.body.error);
    assert.match(map.body.heading, /school on the map/);
    assert.ok(map.body.lines.some((line) => /Cedar Falls High/.test(line)));
    const page = await maya.html("/schools/map");
    assert.match(page.text, /Cedar Falls High/);
  });

  await t.test("several unsorted uploads file onto one person at once", async () => {
    const filed = await maya.json<{ heading: string; count?: number }>("/api/box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds: [ids.box1, ids.box2], personId: ids.june }),
    });
    assert.equal(filed.status, 200, filed.body.error);
    assert.match(filed.body.heading, /2 uploads filed onto June Whitaker/);
    const empty = await maya.json<{ assets: { id: string }[] }>("/api/box");
    assert.equal(empty.body.assets.length, 0);
    const blocked = await viewer.json("/api/box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds: [ids.box1], personId: ids.june }),
    });
    assert.equal(blocked.status, 403);
  });

  await t.test("the style sheet is used by the book and group sheets", async () => {
    const styled = await maya.json<{ heading: string; example: string }>("/api/style", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameStyle: "family-given", dateStyle: "year-only" }),
    });
    assert.equal(styled.status, 200, styled.body.error);
    assert.match(styled.body.heading, /style sheet/);
    const book = await maya.html(`/book?personId=${ids.rose}`);
    assert.match(book.text, /Whitaker, Rose|Rose Whitaker/);
    const sheet = await maya.html(`/group-sheets/${ids.rose}`);
    assert.match(sheet.text, /Rose|Whitaker/);
    const stylePage = await maya.html("/style");
    assert.match(stylePage.text, /Family style sheet/);
  });

  await t.test("the year page credits who added each item", async () => {
    const year = await maya.json<{ items: { title: string; credit?: string }[] }>("/api/year?year=2026");
    assert.equal(year.status, 200, year.body.error);
    assert.ok(year.body.items.some((item) => item.credit && /Added by/.test(item.credit)));
    const page = await maya.html("/year?year=2026");
    assert.match(page.text, /Added by Maya Park|How did Rose keep Sunday dinner/);
  });

  await t.test("a restoration pair keeps the original scan beside the cleaned copy", async () => {
    const restore = await maya.json<{ heading: string; restore: { id: string } }>("/api/restores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Rose picnic",
        originalId: ids.original,
        cleanedId: ids.cleaned,
        notes: "Lily cleaned the cottonwoods.",
      }),
    });
    assert.equal(restore.status, 200, restore.body.error);
    assert.match(restore.body.heading, /Restoration pair/);
    ids.restore = restore.body.restore.id;
    const page = await maya.html(`/restores/${ids.restore}`);
    assert.match(page.text, /Original scan/);
    assert.match(page.text, /Cleaned copy/);
    const list = await maya.html("/restores");
    assert.match(list.text, /Rose picnic/);
  });
});
