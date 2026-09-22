import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can attach scans, propose a correction, and keep a private journal", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("attach-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker attach",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("attach-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a place, and two photographs entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F", burialPlot: "old row" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
      { key: "june", displayName: "June Whitaker", birthDate: "1956-04-01" },
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
      body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa", kind: "city" }),
    });
    assert.equal(place.status, 200, place.body.error);
    ids.place = place.body.place.id;
    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "census-1940.svg");
    picnic.set("title", "1940 census page");
    picnic.set("capturedAt", "1940-04-01");
    const scan1940 = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
    assert.equal(scan1940.status, 200, scan1940.body.error);
    ids.scan1940 = scan1940.body.asset.id;
    const later = new FormData();
    later.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "census-1950.svg");
    later.set("title", "1950 census page");
    later.set("capturedAt", "1950-04-01");
    const scan1950 = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: later });
    assert.equal(scan1950.status, 200, scan1950.body.error);
    ids.scan1950 = scan1950.body.asset.id;
    const manifest = new FormData();
    manifest.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "manifest.svg");
    manifest.set("title", "SS Eastern Star manifest");
    const shipScan = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: manifest });
    assert.equal(shipScan.status, 200, shipScan.body.error);
    ids.manifest = shipScan.body.asset.id;
  });

  await t.test("the census scan is attached to a household and shown on the two-year comparison", async () => {
    const first = await maya.json<{ household: { id: string } }>("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 1940,
        place: "Cedar Falls",
        street: "Whitaker house",
        groupKey: "whitaker-cedar-falls",
        personIds: [ids.rose],
      }),
    });
    assert.equal(first.status, 200, first.body.error);
    ids.house1940 = first.body.household.id;
    const second = await maya.json<{ household: { id: string } }>("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 1950,
        place: "Cedar Falls",
        street: "Whitaker house",
        groupKey: "whitaker-cedar-falls",
        personIds: [ids.rose, ids.louis],
      }),
    });
    assert.equal(second.status, 200, second.body.error);
    ids.house1950 = second.body.household.id;
    const attach = await maya.json<{ household: { scan?: { title?: string } } }>("/api/households/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: ids.house1940, assetId: ids.scan1940 }),
    });
    assert.equal(attach.status, 200, attach.body.error);
    assert.equal(attach.body.household.scan?.title, "1940 census page");
    await maya.json("/api/households/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: ids.house1950, assetId: ids.scan1950 }),
    });
    const blocked = await viewer.json("/api/households/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: ids.house1940, assetId: ids.scan1940 }),
    });
    assert.equal(blocked.status, 403);
    const page = await maya.html("/census/compare?group=whitaker-cedar-falls");
    assert.match(page.text, /Census scan · Cedar Falls, 1940/);
    assert.match(page.text, /Census scan · Cedar Falls, 1950/);
    assert.match(page.text, /census-scans/);
  });

  await t.test("the ship manifest is attached to a voyage’s passenger list", async () => {
    const voyage = await maya.json<{ voyage: { id: string } }>("/api/voyages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ship: "SS Eastern Star",
        departedFrom: "Hong Kong",
        arrivedAt: "San Francisco",
        departedOn: "1972-03-04",
        personIds: [ids.louis],
      }),
    });
    assert.equal(voyage.status, 200, voyage.body.error);
    ids.voyage = voyage.body.voyage.id;
    const attach = await maya.json<{ voyage: { manifest?: { title?: string } } }>("/api/voyages/manifest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voyageId: ids.voyage, assetId: ids.manifest }),
    });
    assert.equal(attach.status, 200, attach.body.error);
    assert.equal(attach.body.voyage.manifest?.title, "SS Eastern Star manifest");
    const page = await maya.html(`/voyages/${ids.voyage}`);
    assert.match(page.text, /Ship manifest · SS Eastern Star/);
    assert.match(page.text, /Louis Whitaker/);
  });

  await t.test("a viewer proposes a correction and an owner accepts or dismisses it", async () => {
    const proposed = await viewer.json<{ suggestion: { id: string; status: string } }>("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        field: "burialPlot",
        proposedValue: "Fairview, plot near the cedar",
        note: "The parish book says the cedar.",
      }),
    });
    assert.equal(proposed.status, 200, proposed.body.error);
    assert.equal(proposed.body.suggestion.status, "pending");
    ids.suggest = proposed.body.suggestion.id;
    const dismissMe = await viewer.json("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ids.suggest, status: "dismissed" }),
    });
    assert.equal(dismissMe.status, 403);
    const accepted = await maya.json<{ suggestion: { status: string } }>("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ids.suggest, status: "accepted" }),
    });
    assert.equal(accepted.status, 200, accepted.body.error);
    assert.equal(accepted.body.suggestion.status, "accepted");
    const person = await maya.json<{ person: { burialPlot?: string } }>(`/api/people/${ids.rose}`);
    assert.equal(person.body.person.burialPlot, "Fairview, plot near the cedar");
    const extra = await viewer.json<{ suggestion: { id: string } }>("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.louis,
        field: "notes",
        proposedValue: "He bought the navy hatband.",
      }),
    });
    assert.equal(extra.status, 200, extra.body.error);
    const dismissed = await maya.json<{ suggestion: { status: string } }>("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: extra.body.suggestion.id, status: "dismissed" }),
    });
    assert.equal(dismissed.body.suggestion.status, "dismissed");
    const inbox = await maya.html("/suggestions");
    assert.match(inbox.text, /No corrections waiting|corrections/);
    const history = await maya.html("/suggestions/history");
    assert.match(history.text, /Fairview, plot near the cedar/);
  });

  await t.test("two lives sit on one timeline", async () => {
    const lives = await maya.json<{ heading: string; items: { who: string; title: string }[] }>(
      `/api/lives?a=${ids.rose}&b=${ids.louis}`,
    );
    assert.equal(lives.status, 200, lives.body.error);
    assert.match(lives.body.heading, /Rose Whitaker and Louis Whitaker on one timeline/);
    assert.ok(lives.body.items.some((item) => item.who === "Rose Whitaker"));
    assert.ok(lives.body.items.some((item) => item.who === "Louis Whitaker"));
    const page = await maya.html(`/lives?a=${ids.rose}&b=${ids.louis}`);
    assert.match(page.text, /Rose Whitaker and Louis Whitaker on one timeline/);
  });

  await t.test("GEDCOM export for one named branch only", async () => {
    const branch = await maya.json<{ branch: { id: string } }>("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Cedar Falls Whitakers",
        summary: "The Market Street line",
        personIds: [ids.rose, ids.louis],
      }),
    });
    assert.equal(branch.status, 200, branch.body.error);
    ids.branch = branch.body.branch.id;
    const scoped = await maya.request(`/api/gedcom?branchId=${ids.branch}`);
    const text = await scoped.text();
    assert.match(text, /0 HEAD/);
    assert.match(text, /Rose/);
    assert.match(text, /Louis/);
    assert.equal(/Maya/.test(text), false);
    const filename = scoped.headers.get("content-disposition") || "";
    assert.match(filename, /cedar-falls-whitakers\.ged/);
    const page = await maya.html("/branches");
    assert.match(page.text, /GEDCOM · Cedar Falls Whitakers/);
  });

  await t.test("a webcal feed of family dates treats the subscriber as a viewer", async () => {
    const token = await maya.json<{ token: string; heading: string }>("/api/cal/token", { method: "POST" });
    assert.equal(token.status, 200, token.body.error);
    assert.ok(token.body.token);
    ids.cal = token.body.token;
    const blocked = await viewer.json("/api/cal/token", { method: "POST" });
    assert.equal(blocked.status, 403);
    const guest = new ApiClient();
    const feed = await guest.request(`/api/cal/${ids.cal}`);
    const ics = await feed.text();
    assert.equal(feed.status, 200);
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /Rose Whitaker/);
    if (/Maya Park/.test(ics)) {
      assert.match(ics, /Birthday · Maya Park/);
      assert.equal(/1983/.test(ics), false);
    }
    const missing = await guest.request("/api/cal/not-a-real-token");
    assert.equal(missing.status, 404);
    const page = await maya.html("/calendar/subscribe");
    assert.match(page.text, /Whitaker attach family dates/);
  });

  await t.test("printable reunion name tags list who is coming", async () => {
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Hart reunion at the north farm",
        place: "Cedar Falls",
        happenedOn: "2026-07-04",
        personIds: [ids.maya, ids.june],
      }),
    });
    assert.equal(reunion.status, 200, reunion.body.error);
    ids.reunion = reunion.body.reunion.id;
    const page = await maya.html(`/reunions/${ids.reunion}/tags`);
    assert.match(page.text, /2 name tags for Hart reunion/);
    assert.match(page.text, /Maya Park/);
    assert.match(page.text, /June Whitaker/);
  });

  await t.test("a private journal stays hidden until the author shares it as a story", async () => {
    const entry = await maya.json<{ entry: { id: string; storyId?: string | null } }>("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "What I still remember of Grandma's cider",
        body: "She said the cider was too sweet. The cousins have not heard this yet.",
        recordedAt: "2026-03-12",
      }),
    });
    assert.equal(entry.status, 200, entry.body.error);
    ids.journal = entry.body.entry.id;
    assert.equal(entry.body.entry.storyId, null);
    const hidden = await viewer.json<{ entries: { id: string }[] }>("/api/journal");
    assert.equal(hidden.body.entries.some((row) => row.id === ids.journal), false);
    const storiesBefore = await viewer.json<{ stories?: { title: string }[]; items?: { title: string }[] }>("/api/stories");
    const beforeList = storiesBefore.body.stories ?? storiesBefore.body.items ?? [];
    assert.equal(beforeList.some((row) => row.title.includes("Grandma's cider")), false);
    const shared = await maya.json<{ entry: { storyId?: string }; story: { title: string } }>("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ids.journal, share: true }),
    });
    assert.equal(shared.status, 200, shared.body.error);
    assert.ok(shared.body.entry.storyId);
    assert.match(shared.body.story.title, /cider/);
    const page = await maya.html("/journal");
    assert.match(page.text, /shared as a story/);
  });

  await t.test("everything that happened in one place is on that place’s page", async () => {
    await maya.json("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker house",
        line: "14 Market Street",
        locality: "Cedar Falls",
        placeId: ids.place,
        personIds: [ids.rose],
      }),
    });
    const chronicle = await maya.json<{ heading: string; items: { kind: string; title: string }[] }>(
      `/api/chronicle?placeId=${ids.place}`,
    );
    assert.equal(chronicle.status, 200, chronicle.body.error);
    assert.ok(chronicle.body.items.some((item) => item.kind === "home"));
    assert.ok(chronicle.body.items.some((item) => item.kind === "census"));
    const page = await maya.html(`/places/${ids.place}`);
    assert.match(page.text, /place-chronicle/);
    assert.match(page.text, /Whitaker house|Census/);
  });

  await t.test("duplicate homes merge photographs, residents, and land into one house", async () => {
    const keep = await maya.json<{ home: { id: string } }>("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Whitaker house", line: "14 Market Street", locality: "Cedar Falls" }),
    });
    const drop = await maya.json<{ home: { id: string } }>("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "The Whitaker house", line: "14 Market Street", locality: "Cedar Falls" }),
    });
    assert.equal(keep.status, 200, keep.body.error);
    assert.equal(drop.status, 200, drop.body.error);
    ids.keepHome = keep.body.home.id;
    ids.dropHome = drop.body.home.id;
    await maya.json("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeId: ids.dropHome, personId: ids.louis, startedOn: "1949-01-01" }),
    });
    const dups = await maya.json<{ heading: string; groups: { keep: { id: string } }[] }>("/api/homes/duplicates");
    assert.match(dups.body.heading, /house looks duplicated/);
    assert.ok(dups.body.groups.length >= 1);
    const merged = await maya.json<{ home: { id: string; residents: { personId: string }[] } }>("/api/homes/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId: ids.keepHome, dropId: ids.dropHome }),
    });
    assert.equal(merged.status, 200, merged.body.error);
    assert.ok(merged.body.home.residents.some((row) => row.personId === ids.louis));
    const gone = await maya.html(`/homes/${ids.dropHome}`);
    assert.equal(gone.status, 404);
    const page = await maya.html("/homes/duplicates");
    assert.equal(page.status, 200);
  });

  await t.test("later attach pages keep the next useful work together", async () => {
    const missingScans = await maya.html("/scans/missing");
    assert.equal(missingScans.status, 200);
    const missingManifests = await maya.html("/manifests/missing");
    assert.equal(missingManifests.status, 200);
    const shared = await maya.html("/journal/shared");
    assert.match(shared.text, /shared as a story/);
    const mergePage = await maya.html("/homes/merge");
    assert.match(mergePage.text, /Merge duplicate homes/);
  });
});
