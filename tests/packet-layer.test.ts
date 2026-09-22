import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg, makeWav } from "./helpers/fixtures";
import { zipEntryNames } from "../src/lib/zip";

const PASSWORD = "millinery-1952";

test("a relative can pack a life, protect a child, and keep later family records", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("packet-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker packet",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const invite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "contributor" }),
  });
  assert.equal(invite.status, 200, invite.body.error);
  const ned = new ApiClient();
  const nedEmail = uniqueEmail("packet-ned");
  await ned.signup({ name: "Ned Park", email: nedEmail, password: PASSWORD, invite: invite.body.token });
  await ned.signIn(nedEmail, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  assert.equal(viewInvite.status, 200, viewInvite.body.error);
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("packet-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};
  const paths: Record<string, string> = {};

  await t.test("people, a letter, photographs, and a child entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
      { key: "nora", displayName: "Nora Park", givenName: "Nora", familyName: "Park", birthDate: "2018-06-14" },
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
      { fromPersonId: ids.helen, toPersonId: ids.maya, type: "parent" },
      { fromPersonId: ids.maya, toPersonId: ids.nora, type: "parent" },
    ]) {
      const created = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rel),
      });
      assert.equal(created.status, 200, created.body.error);
    }

    const letter = new FormData();
    letter.set("title", "June to Helen, millinery counter");
    letter.set("kind", "letter");
    letter.set("writtenAt", "1952-06-14");
    letter.set("transcript", ROSE_LETTER);
    letter.set("personIds", `${ids.rose},${ids.louis}`);
    const saved = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(saved.status, 200, saved.body.error);
    ids.letter = saved.body.document.id;

    const rosePhoto = new FormData();
    rosePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "counter.svg");
    rosePhoto.set("title", "Rose at the millinery counter");
    const roseAsset = await maya.json<{ asset: { id: string; storagePath: string } }>("/api/assets", { method: "POST", body: rosePhoto });
    assert.equal(roseAsset.status, 200, roseAsset.body.error);
    ids.photo = roseAsset.body.asset.id;
    paths.photo = roseAsset.body.asset.storagePath;
    const placed = await maya.json<{ tag: { x: number; y: number } }>("/api/assets/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.photo, personId: ids.rose, x: 42, y: 38 }),
    });
    assert.equal(placed.status, 200, placed.body.error);
    assert.equal(placed.body.tag.x, 42);

    const childPhoto = new FormData();
    childPhoto.set("file", new Blob([makePhotoSvg("#4d5b3c")], { type: "image/svg+xml" }), "nora.svg");
    childPhoto.set("title", "Nora at the picnic");
    const childAsset = await maya.json<{ asset: { id: string; storagePath: string } }>("/api/assets", { method: "POST", body: childPhoto });
    assert.equal(childAsset.status, 200, childAsset.body.error);
    ids.childPhoto = childAsset.body.asset.id;
    paths.childPhoto = childAsset.body.asset.storagePath;
    await maya.json("/api/assets/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.childPhoto, personId: ids.nora }),
    });

    const album = await maya.json<{ album: { id: string } }>("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Whitaker picnic album", summary: "Rose and the children" }),
    });
    assert.equal(album.status, 200, album.body.error);
    ids.album = album.body.album.id;
    for (const assetId of [ids.photo, ids.childPhoto]) {
      const added = await maya.json(`/api/albums/${ids.album}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      assert.equal(added.status, 200, added.body.error);
    }
    const share = await maya.json<{ href: string; link: { token: string } }>("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "album", entityId: ids.album }),
    });
    assert.equal(share.status, 200, share.body.error);
    ids.share = share.body.link.token;
  });

  await t.test("one packet downloads that person’s photos, letters, and facts", async () => {
    const packet = await maya.request(`/api/people/${ids.rose}/packet`);
    assert.equal(packet.status, 200);
    const bytes = Buffer.from(await packet.arrayBuffer());
    assert.equal(bytes.readUInt32LE(0), 0x04034b50);
    const names = zipEntryNames(bytes);
    assert.ok(names.includes("facts.txt"));
    assert.ok(names.some((name) => name.startsWith("letters/")));
    assert.ok(names.some((name) => name.startsWith("photos/")));
    const page = await maya.html(`/people/${ids.rose}/packet`);
    assert.equal(page.status, 200);
    assert.match(page.text, /Person packet|Rose Whitaker/);
    assert.match(page.text, /Download the packet/);
  });

  await t.test("share links and viewer accounts hide living minors’ details and photos", async () => {
    const guest = new ApiClient();
    const shared = await guest.html(`/s/${ids.share}`);
    assert.equal(shared.status, 200);
    assert.match(shared.text, /Whitaker picnic album/);
    assert.doesNotMatch(shared.text, /Nora at the picnic/);
    assert.doesNotMatch(shared.text, /Nora Park/);
    const leaked = await guest.request(`/api/media/${paths.childPhoto}`);
    assert.equal(leaked.status, 404);
    const open = await guest.request(`/api/media/${paths.photo}`);
    assert.equal(open.status, 200);

    const hidden = await viewer.json<{ person: { childHidden?: boolean; tags: unknown[]; factsHidden?: boolean } }>(
      `/api/people/${ids.nora}`,
    );
    assert.equal(hidden.status, 200);
    assert.equal(hidden.body.person.childHidden, true);
    assert.equal(hidden.body.person.tags.length, 0);
    const childPage = await viewer.html(`/people/${ids.nora}`);
    assert.match(childPage.text, /data-testid="child-privacy-note"/);
    assert.match(childPage.text, /Living children are hidden from viewers/);
    assert.doesNotMatch(childPage.text, /Born 14 June 2018/);
    assert.doesNotMatch(childPage.text, /Nora at the picnic/);
    const viewerMedia = await viewer.request(`/api/media/${paths.childPhoto}`);
    assert.equal(viewerMedia.status, 404);
    const viewerPacket = await viewer.request(`/api/people/${ids.nora}/packet`);
    assert.equal(viewerPacket.status, 403);
    const living = await viewer.html("/living");
    assert.doesNotMatch(living.text, /Nora Park/);
    const children = await viewer.html("/children");
    assert.match(children.text, /stay with contributors|Living children/);
    assert.doesNotMatch(children.text, /Nora Park/);
    const allowed = await maya.request(`/api/media/${paths.childPhoto}`);
    assert.equal(allowed.status, 200);
    const kids = await maya.html("/children");
    assert.match(kids.text, /Nora Park/);
  });

  await t.test("a spoken answer on a story prompt is saved with the story", async () => {
    const prompt = await maya.json<{ prompt: { id: string } }>("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "How did they keep Sunday dinner?", body: "Say it the way the kitchen heard it." }),
    });
    assert.equal(prompt.status, 200, prompt.body.error);
    ids.prompt = prompt.body.prompt.id;
    const spoken = new FormData();
    spoken.set("promptId", ids.prompt);
    spoken.set("body", "Helen kept the navy hatband in the cedar chest and still talks about Sunday rolls.");
    spoken.set("personId", ids.helen);
    spoken.set("file", new Blob([makeWav()], { type: "audio/wav" }), "sunday.wav");
    const answered = await maya.json<{ story: { id: string; body: string }; answer: { assetId?: string | null } }>(
      "/api/prompts/answers",
      { method: "POST", body: spoken },
    );
    assert.equal(answered.status, 200, answered.body.error);
    assert.match(answered.body.story.body, /navy hatband/);
    assert.ok(answered.body.answer.assetId);
    ids.story = answered.body.story.id;
    const storyPage = await maya.html(`/stories/${ids.story}`);
    assert.match(storyPage.text, /navy hatband/);
    assert.match(storyPage.text, /story-spoken|audio/);
  });

  await t.test("a reunion potluck dish is tied to a cookbook recipe and who is bringing it", async () => {
    const recipe = await maya.json<{ recipe: { id: string } }>("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Sunday rolls",
        body: "Warm milk, a cake of yeast, and the navy-blue bowl.",
        personIds: [ids.rose],
      }),
    });
    assert.equal(recipe.status, 200, recipe.body.error);
    ids.recipe = recipe.body.recipe.id;
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker reunion at Market Street",
        place: "Cedar Falls",
        happenedOn: "2026-07-04",
        personIds: [ids.helen, ids.maya],
      }),
    });
    assert.equal(reunion.status, 200, reunion.body.error);
    ids.reunion = reunion.body.reunion.id;
    const dish = await maya.json<{ dish: { title: string; recipeId: string | null } }>("/api/reunions/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reunionId: ids.reunion,
        title: "Sunday rolls",
        personId: ids.helen,
        recipeId: ids.recipe,
        notes: "Warm, in the navy-blue bowl",
      }),
    });
    assert.equal(dish.status, 200, dish.body.error);
    assert.equal(dish.body.dish.recipeId, ids.recipe);
    const page = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(page.text, /Sunday rolls/);
    assert.match(page.text, /Helen Park/);
    const index = await maya.html("/potluck");
    assert.match(index.text, /Sunday rolls/);
  });

  await t.test("a fact can be an original, a copy, or unsure", async () => {
    const citation = await maya.json<{ citation: { quality: string } }>("/api/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "Rose was born in Cedar Falls",
        personId: ids.rose,
        documentId: ids.letter,
        quality: "original",
      }),
    });
    assert.equal(citation.status, 200, citation.body.error);
    assert.equal(citation.body.citation.quality, "original");
    const worksheet = await maya.json<{ citation: { quality: string | null } }>("/api/worksheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "death", personId: ids.rose, year: "2008-11-02", place: "Cedar Falls", quality: "copy" }),
    });
    assert.equal(worksheet.status, 200, worksheet.body.error);
    assert.equal(worksheet.body.citation.quality, "copy");
    const quality = await maya.html("/quality");
    assert.match(quality.text, /Original|Rose was born/);
  });

  await t.test("a research log entry can keep a file", async () => {
    const form = new FormData();
    form.set("title", "County register copy of Rose’s birth");
    form.set("body", "Ask the clerk for book 12.");
    form.set("personId", ids.rose);
    form.set("file", new Blob([makePhotoSvg("#6b4b2a")], { type: "image/svg+xml" }), "register.svg");
    const task = await maya.json<{ task: { asset?: { id: string } | null } }>("/api/tasks", { method: "POST", body: form });
    assert.equal(task.status, 200, task.body.error);
    assert.ok(task.body.task.asset?.id);
    const page = await maya.html("/tasks");
    assert.match(page.text, /County register copy/);
    assert.match(page.text, /Attached file/);
  });

  await t.test("a name can be marked with how to say it", async () => {
    const saved = await maya.json<{ person: { pronunciation: string | null } }>(`/api/people/${ids.rose}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pronunciation: "rose WIT-uh-ker" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.equal(saved.body.person.pronunciation, "rose WIT-uh-ker");
    const page = await maya.html(`/people/${ids.rose}`);
    assert.match(page.text, /rose WIT-uh-ker/);
    const list = await maya.html("/pronounce");
    assert.match(list.text, /rose WIT-uh-ker/);
  });

  await t.test("the printable fan and who-is-where marks are on the page", async () => {
    const fan = await maya.html(`/fan/print?personId=${ids.maya}`);
    assert.equal(fan.status, 200);
    assert.match(fan.text, /Printable ancestor fan|Ancestor fan/);
    assert.match(fan.text, /Rose Whitaker|Maya Park/);
    const photo = await maya.html(`/archive/${ids.photo}`);
    assert.match(photo.text, /who-where|Rose Whitaker/);
    const unlocated = await maya.html("/photos/unlocated");
    assert.match(unlocated.text, /Nora Park|Tagged, but not placed/);
  });

  await t.test("this week lists what relatives added in the last seven days", async () => {
    const week = await maya.json<{ items: { title: string }[]; heading: string }>("/api/week");
    assert.equal(week.status, 200, week.body.error);
    assert.ok(week.body.items.some((item) => /Sunday rolls|Rose Whitaker|June to Helen|spoken|register/i.test(item.title)));
    const home = await maya.html("/");
    assert.match(home.text, /this week|What relatives added/i);
    const page = await maya.html("/week");
    assert.match(page.text, /Sunday rolls|Rose Whitaker|County register/);
  });

  await t.test("later family pages stay findable", async () => {
    const packets = await maya.html("/packets");
    assert.match(packets.text, /Rose Whitaker/);
    const spoken = await maya.html("/spoken");
    assert.match(spoken.text, /Sunday dinner|spoken/i);
    const nedSees = await ned.html(`/people/${ids.rose}/packet`);
    assert.equal(nedSees.status, 200);
  });
});
