import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makeLetterPng, makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can index surnames, tag a photo, and record later family facts", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("more-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker more",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const ids: Record<string, string> = {};
  await t.test("people, parent links, and the surname index", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { key: "helen", displayName: "Helen Park", givenName: "Helen", familyName: "Park", birthDate: "1954-09-22" },
      { key: "ned", displayName: "Ned Park", givenName: "Ned", familyName: "Park", birthDate: "1956-04-01" },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    for (const child of [ids.helen, ids.ned]) {
      const rel = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPersonId: ids.rose, toPersonId: child, type: "parent" }),
      });
      assert.equal(rel.status, 200, rel.body.error);
    }
    const surnames = await maya.json<{ surnames: { surname: string; people: { displayName: string }[] }[] }>("/api/surnames");
    assert.ok(surnames.body.surnames.some((group) => group.surname === "Whitaker"));
    assert.ok(surnames.body.surnames.some((group) => group.surname === "Park" && group.people.length >= 2));
  });

  await t.test("place page, descendants, and shared ancestors", async () => {
    const residence = await maya.json<{ residence: { placeId: string } }>("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        name: "Market Street",
        locality: "Cedar Falls",
        region: "Iowa",
        country: "United States",
        startedAt: "1948-06-14",
        notes: "Above the millinery counter",
      }),
    });
    assert.equal(residence.status, 200, residence.body.error);
    ids.place = residence.body.residence.placeId;
    const placePage = await maya.html(`/places/${ids.place}`);
    assert.match(placePage.text, /Market Street|Rose Whitaker/);

    const descendants = await maya.html(`/people/${ids.rose}/descendants`);
    assert.match(descendants.text, /Helen Park/);
    assert.match(descendants.text, /Ahnentafel/);

    const shared = await maya.json<{ ancestors: { displayName: string }[] }>(
      `/api/shared?from=${ids.helen}&to=${ids.ned}`,
    );
    assert.ok(shared.body.ancestors.some((ancestor) => ancestor.displayName === "Rose Whitaker"));
  });

  await t.test("photo tag, source, obituary, will, tradition, and a research task", async () => {
    const photo = new FormData();
    photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "counter.svg");
    photo.set("title", "The millinery counter");
    photo.set("capturedAt", "1952-06-14");
    const uploaded = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
    assert.equal(uploaded.status, 200, uploaded.body.error);
    ids.asset = uploaded.body.asset.id;
    const tag = await maya.json("/api/assets/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.asset, personId: ids.rose }),
    });
    assert.equal(tag.status, 200, tag.body.error);

    const scan = makeLetterPng();
    const obituary = new FormData();
    obituary.set("file", new Blob([scan.bytes], { type: "image/png" }), "obit.png");
    obituary.set("title", "Rose Whitaker of Market Street");
    obituary.set("writtenAt", "2008-11-04");
    obituary.set("transcript", "Rose Whitaker kept the millinery counter on Market Street.");
    obituary.set("personIds", ids.rose);
    const obit = await maya.json<{ document: { id: string; kind: string } }>("/api/obituaries", { method: "POST", body: obituary });
    assert.equal(obit.status, 200, obit.body.error);
    assert.equal(obit.body.document.kind, "obituary");
    ids.obit = obit.body.document.id;

    const cite = await maya.json("/api/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "Rose kept the millinery counter",
        personId: ids.rose,
        documentId: ids.obit,
        pageNote: "opening sentence",
      }),
    });
    assert.equal(cite.status, 200, cite.body.error);

    const will = await maya.json<{ will: { title: string } }>("/api/wills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Rose’s will",
        body: "The navy hatband stays with Helen.",
        writtenAt: "2001-03-08",
        personIds: [ids.rose, ids.helen],
      }),
    });
    assert.equal(will.status, 200, will.body.error);

    const tradition = await maya.json("/api/traditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Sunday rolls after church",
        season: "Sundays",
        personId: ids.rose,
        summary: "Warm milk and the navy-blue bowl.",
      }),
    });
    assert.equal(tradition.status, 200, tradition.body.error);

    const task = await maya.json<{ task: { id: string } }>("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Ask Helen who kept the navy hatband", personId: ids.helen }),
    });
    assert.equal(task.status, 200, task.body.error);
    const done = await maya.json("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.body.task.id, done: true }),
    });
    assert.equal(done.status, 200, done.body.error);

    const naturalization = await maya.json("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.helen,
        kind: "naturalization",
        title: "Helen naturalized in Iowa City",
        happenedOn: "1976-05-15",
      }),
    });
    assert.equal(naturalization.status, 200, naturalization.body.error);
  });

  await t.test("new pages render for a relative", async () => {
    const pages = [
      ["/surnames", /Surname index|Whitaker/],
      ["/places", /Places|Market Street/],
      [`/places/${ids.place}`, /Market Street|Rose/],
      [`/people/${ids.rose}/descendants`, /Helen Park|Ahnentafel/],
      [`/shared?from=${ids.helen}&to=${ids.ned}`, /Rose Whitaker/],
      ["/sources", /Rose kept the millinery counter/],
      ["/obituaries", /Rose Whitaker of Market Street/],
      ["/wills", /Rose’s will|navy hatband/],
      ["/traditions", /Sunday rolls/],
      ["/tasks", /navy hatband/],
      ["/decades", /By decade|1940s|1950s/],
      ["/weddings", /Weddings/],
      ["/census", /Census/],
      ["/dates", /Family dates|Download calendar/],
    ] as const;
    for (const [path, pattern] of pages) {
      const page = await maya.html(path);
      assert.match(page.text, pattern, path);
    }
  });
});
