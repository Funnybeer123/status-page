import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can file the box, record who held an heirloom, and lock a transcript", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("box-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker box",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("box-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a letter, land, and an unfiled upload entered the way a relative would", async () => {
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
    const photo = new FormData();
    photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
    photo.set("title", "Rose at the picnic");
    photo.set("personIds", ids.rose);
    const savedPhoto = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
    assert.equal(savedPhoto.status, 200, savedPhoto.body.error);
    ids.rosePhoto = savedPhoto.body.asset.id;
    const loose = new FormData();
    loose.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "program.svg");
    loose.set("title", "Harvest program still in the box");
    const boxed = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: loose });
    assert.equal(boxed.status, 200, boxed.body.error);
    ids.box = boxed.body.asset.id;
    const letter = new FormData();
    letter.set("title", "June to Maya about Rose");
    letter.set("transcript", "I found Rose's hatband letter in the upstairs hall.");
    letter.set("personIds", ids.rose);
    const savedLetter = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(savedLetter.status, 200, savedLetter.body.error);
    ids.letter = savedLetter.body.document.id;
    const land = await maya.json<{ record: { id: string } }>("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "land",
        personId: ids.louis,
        title: "North farm",
        place: "Cedar Falls, Iowa",
        acquiredOn: "1948-06-14",
        abstract: "The north forty stayed with the children after the 1948 deed.",
      }),
    });
    assert.equal(land.status, 200, land.body.error);
    ids.land = land.body.record.id;
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        name: "Cedar Falls",
        locality: "Cedar Falls",
        region: "Iowa",
        country: "United States",
      }),
    });
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.june,
        name: "Cedar Falls",
        locality: "Cedar Falls",
        region: "Iowa",
        country: "United States",
      }),
    });
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.maya,
        name: "Iowa City",
        locality: "Iowa City",
        region: "Iowa",
        country: "United States",
      }),
    });
  });

  await t.test("the unsorted box lists uploads with no person, then files each one", async () => {
    const box = await maya.json<{ heading: string; assets: { id: string }[] }>("/api/box");
    assert.equal(box.status, 200, box.body.error);
    assert.match(box.body.heading, /1 upload not filed/);
    assert.ok(box.body.assets.some((asset) => asset.id === ids.box));
    const page = await maya.html("/box");
    assert.match(page.text, /Harvest program still in the box/);
    const filed = await maya.json<{ heading: string }>("/api/box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.box, personId: ids.june }),
    });
    assert.equal(filed.status, 200, filed.body.error);
    assert.match(filed.body.heading, /filed onto June Whitaker/);
    const empty = await maya.json<{ heading: string; assets: { id: string }[] }>("/api/box");
    assert.equal(empty.body.assets.length, 0);
    assert.match(empty.body.heading, /Nothing left in the unsorted box/);
    const blocked = await viewer.json("/api/box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.box, personId: ids.june }),
    });
    assert.equal(blocked.status, 403);
  });

  await t.test("heirloom provenance records who held an item, in order", async () => {
    const heirloom = await maya.json<{ heirloom: { id: string } }>("/api/heirlooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Ellie’s cedar chest", personId: ids.june, acquiredAt: "1948-06-14" }),
    });
    assert.equal(heirloom.status, 200, heirloom.body.error);
    ids.chest = heirloom.body.heirloom.id;
    for (const hold of [
      { personId: ids.rose, heldFrom: "1948-06-14", heldUntil: "1995-09-01", note: "Ellie kept the letter in the tray." },
      { personId: ids.june, heldFrom: "1995-09-01", heldUntil: "2024-06-01", note: "June kept it in the hall." },
      { personId: ids.maya, heldFrom: "2024-06-01", note: "Maya has it for the reunion." },
    ]) {
      const saved = await maya.json("/api/heirlooms/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heirloomId: ids.chest, ...hold }),
      });
      assert.equal(saved.status, 200, saved.body.error);
    }
    const chain = await maya.json<{ heading: string; lines: string[]; holds: { person: { displayName: string } }[] }>(
      `/api/heirlooms/holds?heirloomId=${ids.chest}`,
    );
    assert.match(chain.body.heading, /3 people held/);
    assert.equal(chain.body.holds[0]?.person.displayName, "Rose Whitaker");
    assert.equal(chain.body.holds[2]?.person.displayName, "Maya Park");
    const page = await maya.html(`/heirlooms/${ids.chest}`);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Maya Park/);
  });

  await t.test("the portrait wall shows one photograph per person, grouped by generation", async () => {
    const wall = await maya.json<{ heading: string; rows: { heading: string; people: { displayName: string; profileUrl: string | null }[] }[] }>(
      "/api/portraits",
    );
    assert.equal(wall.status, 200, wall.body.error);
    assert.match(wall.body.heading, /portrait/);
    assert.ok(wall.body.rows.some((row) => row.people.some((person) => person.displayName === "Rose Whitaker" && person.profileUrl)));
    const page = await maya.html("/portraits");
    assert.match(page.text, /The eldest generation|Rose Whitaker/);
    const missing = await maya.html("/portraits/missing");
    assert.match(missing.text, /still needs a portrait|Everyone has a portrait|Ivy Park|Maya Park/);
  });

  await t.test("transcription credit and a lock when the transcript is finished", async () => {
    const locked = await maya.json<{ credit: string; lockHeading: string; document: { transcribedById: string } }>(
      `/api/letters/${ids.letter}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lock: true }),
      },
    );
    assert.equal(locked.status, 200, locked.body.error);
    assert.match(locked.body.credit, /Transcribed by Maya Park/);
    assert.match(locked.body.lockHeading, /finished and locked/);
    const blocked = await maya.json<{ error?: string }>(`/api/letters/${ids.letter}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "A changed line after the lock." }),
    });
    assert.equal(blocked.status, 409);
    assert.match(blocked.body.error || "", /locked/);
    const page = await maya.html(`/letters/${ids.letter}`);
    assert.match(page.text, /Transcribed by Maya Park/);
    assert.match(page.text, /finished and locked/);
    const list = await maya.html("/letters/locked");
    assert.match(list.text, /June to Maya about Rose/);
    const credits = await maya.html("/letters/credits");
    assert.match(credits.text, /Transcribed by Maya Park/);
  });

  await t.test("muting a follow stops notices for that person", async () => {
    const follow = await viewer.json<{ following: boolean }>("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose }),
    });
    assert.equal(follow.status, 200, follow.body.error);
    const muted = await viewer.json<{ muted: boolean; muteHeading: string }>("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, muted: true }),
    });
    assert.equal(muted.status, 200, muted.body.error);
    assert.equal(muted.body.muted, true);
    assert.match(muted.body.muteHeading, /muted/);
    const story = await maya.json<{ story: { id: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "The millinery hatband Rose kept after mute",
        body: "Rose kept the navy hatband after the notices were quiet.",
        personIds: [ids.rose],
      }),
    });
    assert.equal(story.status, 200, story.body.error);
    const notices = await viewer.json<{ notifications: { title: string }[] }>("/api/notifications");
    const titles = notices.body.notifications.map((item) => item.title).join("\n");
    assert.doesNotMatch(titles, /millinery hatband Rose kept after mute/);
    const mutedPage = await viewer.html("/following/muted");
    assert.match(mutedPage.text, /Rose Whitaker/);
    const following = await viewer.html("/following");
    assert.match(following.text, /notices muted/);
  });

  await t.test("the deed image is shown on a land abstract", async () => {
    const deed = new FormData();
    deed.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "deed.svg");
    deed.set("title", "North farm deed, 1948");
    const asset = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: deed });
    assert.equal(asset.status, 200, asset.body.error);
    const attached = await maya.json<{ heading: string }>("/api/land/deed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landId: ids.land, assetId: asset.body.asset.id }),
    });
    assert.equal(attached.status, 200, attached.body.error);
    assert.match(attached.body.heading, /Deed image · North farm/);
    const land = await maya.html("/land");
    assert.match(land.text, /Deed image · North farm/);
    const abstracts = await maya.html("/abstracts");
    assert.match(abstracts.text, /Deed image · North farm/);
    const missing = await maya.html("/land/deeds");
    assert.match(missing.text, /Every land abstract has its deed image/);
  });

  await t.test("an age pyramid of living relatives hides living minors from viewers", async () => {
    const pyramid = await maya.json<{ heading: string; bands: { key: string; count: number }[] }>("/api/living/pyramid");
    assert.equal(pyramid.status, 200, pyramid.body.error);
    assert.match(pyramid.body.heading, /living relative/);
    assert.ok((pyramid.body.bands.find((band) => band.key === "0-17")?.count ?? 0) >= 1);
    const viewerPyramid = await viewer.json<{ heading: string; bands: { key: string; count: number }[] }>("/api/living/pyramid");
    assert.equal(viewerPyramid.body.bands.find((band) => band.key === "0-17")?.count ?? 0, 0);
    const page = await maya.html("/living/pyramid");
    assert.match(page.text, /Maya Park|June Whitaker/);
    assert.match(page.text, /18 to 29|30 to 44|60 to 74|Under 18/);
  });

  await t.test("notes from a family meeting list who was there", async () => {
    const meeting = await maya.json<{ heading: string; meeting: { id: string } }>("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Harvest planning at June's",
        happenedOn: "2026-03-20",
        notes: "Bring the cedar chest. File the leftover program onto June.",
        personIds: [ids.june, ids.maya],
      }),
    });
    assert.equal(meeting.status, 200, meeting.body.error);
    assert.match(meeting.body.heading, /Harvest planning/);
    const list = await maya.json<{ heading: string }>("/api/meetings");
    assert.match(list.body.heading, /1 family meeting/);
    const page = await maya.html("/meetings");
    assert.match(page.text, /Bring the cedar chest/);
    assert.match(page.text, /June Whitaker/);
  });

  await t.test("a download of everything the signed-in relative added", async () => {
    const page = await maya.html("/export/mine");
    assert.match(page.text, /things you added|uploads/);
    const zip = await maya.request("/api/export/mine");
    assert.equal(zip.status, 200);
    const bytes = Buffer.from(await zip.arrayBuffer());
    assert.equal(bytes.subarray(0, 2).toString(), "PK");
    assert.match(zip.headers.get("content-disposition") || "", /maya-park-added\.zip/);
  });

  await t.test("a surname map shows where each surname clustered", async () => {
    const map = await maya.json<{ heading: string; clusters: { surname: string; place: string; count: number }[] }>(
      "/api/surnames/map",
    );
    assert.equal(map.status, 200, map.body.error);
    assert.match(map.body.heading, /surname clustered/);
    assert.ok(map.body.clusters.some((cluster) => cluster.surname === "Whitaker" && cluster.count >= 2));
    const page = await maya.html("/surnames/map");
    assert.match(page.text, /Whitaker/);
    assert.match(page.text, /Cedar Falls/);
  });
});
