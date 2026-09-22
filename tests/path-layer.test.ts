import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can walk a path, compare a household, and keep later extracts", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("path-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker path",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("path-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a letter, and a picnic entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
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
      { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" },
      { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.helen, toPersonId: ids.maya, type: "parent" },
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

    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg("#4d5b3c")], { type: "image/svg+xml" }), "picnic.svg");
    picnic.set("title", "Whitaker picnic");
    picnic.set("capturedAt", "1961-07-04");
    picnic.set("personIds", ids.helen);
    const picnicAsset = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
    assert.equal(picnicAsset.status, 200, picnicAsset.body.error);
    ids.picnic = picnicAsset.body.asset.id;

    const story = await maya.json<{ story: { id: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Sunday rolls in later years",
        body: "Rose kept the navy-blue bowl for Sunday rolls.",
        recordedAt: "2001-04-02",
        tellerPersonId: ids.rose,
        personIds: [ids.rose],
      }),
    });
    assert.equal(story.status, 200, story.body.error);
    ids.story = story.body.story.id;
  });

  await t.test("the relationship path shows the people between two relatives", async () => {
    const related = await maya.json<{ related: { sentence: string; steps: { fromName: string; toName: string }[] } }>(
      `/api/related?from=${ids.maya}&to=${ids.rose}`,
    );
    assert.equal(related.status, 200, related.body.error);
    assert.match(related.body.related.sentence, /grandchild/);
    assert.ok(related.body.related.steps.some((step) => step.toName === "Helen Park" || step.fromName === "Helen Park"));
    const page = await maya.html(`/related?from=${ids.maya}&to=${ids.rose}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /related-path|Maya Park/);
    assert.match(page.text, /Helen Park/);
    assert.match(page.text, /Rose Whitaker/);
  });

  await t.test("the same household in two years is compared side by side", async () => {
    const first = await maya.json<{ household: { id: string } }>("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: 1940,
        place: "Cedar Falls",
        street: "Whitaker house",
        groupKey: "whitaker-cedar-falls",
        people: [{ personId: ids.rose, role: "daughter", age: 11 }],
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
        street: "North farm",
        groupKey: "whitaker-cedar-falls",
        people: [
          { personId: ids.rose, role: "wife", age: 21, occupation: "keeping house" },
          { personId: ids.louis, role: "head", age: 23, occupation: "farmer" },
        ],
      }),
    });
    assert.equal(second.status, 200, second.body.error);
    ids.house1950 = second.body.household.id;
    const page = await maya.html("/census/compare?group=whitaker-cedar-falls");
    assert.equal(page.status, 200);
    assert.match(page.text, /1940/);
    assert.match(page.text, /1950/);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Louis Whitaker/);
    assert.match(page.text, /Stayed|Arrived/);
    const households = await maya.html("/households");
    assert.match(households.text, /Cedar Falls, 1950/);
  });

  await t.test("a church register extract links baptism, marriage, and burial lines", async () => {
    const register = await maya.json<{ register: { id: string } }>("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        church: "St. John's",
        place: "Cedar Falls, Iowa",
        lines: [
          { kind: "baptism", happenedOn: "1929-04-08", text: "Rose Whitaker baptised.", personId: ids.rose },
          { kind: "marriage", happenedOn: "1953-05-01", text: "Rose and Louis married.", personId: ids.rose, otherPersonId: ids.louis },
          { kind: "burial", happenedOn: "2008-11-05", text: "Rose Whitaker buried at Fairview.", personId: ids.rose },
        ],
      }),
    });
    assert.equal(register.status, 200, register.body.error);
    ids.register = register.body.register.id;
    const page = await maya.html(`/registers/${ids.register}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /St\. John's/);
    assert.match(page.text, /baptism/);
    assert.match(page.text, /marriage/);
    assert.match(page.text, /burial/);
    assert.match(page.text, /Rose Whitaker/);
  });

  await t.test("a tax list names who was assessed in a place and year", async () => {
    const list = await maya.json<{ list: { id: string } }>("/api/tax", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place: "Cedar Falls",
        year: 1950,
        names: [{ name: "Louis Whitaker", personId: ids.louis, amount: "$42.00" }],
      }),
    });
    assert.equal(list.status, 200, list.body.error);
    ids.tax = list.body.list.id;
    const named = await maya.json("/api/tax/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId: ids.tax, name: "Rose Whitaker", personId: ids.rose }),
    });
    assert.equal(named.status, 200, named.body.error);
    const page = await maya.html(`/tax/${ids.tax}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /Cedar Falls, 1950/);
    assert.match(page.text, /Louis Whitaker/);
    assert.match(page.text, /\$42\.00/);
  });

  await t.test("a passenger list keeps who sailed, with age and role", async () => {
    const voyage = await maya.json<{ voyage: { id: string } }>("/api/voyages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ship: "SS Eastern Star",
        departedFrom: "Hong Kong",
        arrivedAt: "San Francisco",
        departedOn: "1972-03-04",
        passengers: [{ personId: ids.louis, age: 45, role: "passenger", notes: "boarding card" }],
      }),
    });
    assert.equal(voyage.status, 200, voyage.body.error);
    ids.voyage = voyage.body.voyage.id;
    const extra = await maya.json("/api/voyages/passengers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voyageId: ids.voyage, personId: ids.rose, age: 43, role: "passenger" }),
    });
    assert.equal(extra.status, 200, extra.body.error);
    const page = await maya.html(`/voyages/${ids.voyage}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /SS Eastern Star/);
    assert.match(page.text, /Louis Whitaker/);
    assert.match(page.text, /age 45|45/);
  });

  await t.test("the large-print tree poster lists generations", async () => {
    const page = await maya.html("/tree/poster");
    assert.equal(page.status, 200);
    assert.match(page.text, /tree-poster|tree poster|Rose Whitaker/);
    assert.match(page.text, /Helen Park|Maya Park/);
  });

  await t.test("a relative can save a search and reopen it", async () => {
    const saved = await maya.json<{ search: { id: string } }>("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "harvest dance", query: "millinery" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    const list = await maya.json<{ searches: { title: string; query: string }[] }>("/api/searches");
    assert.ok(list.body.searches.some((row) => row.query === "millinery"));
    const page = await maya.html("/searches");
    assert.equal(page.status, 200);
    assert.match(page.text, /harvest dance|millinery/);
  });

  await t.test("a sticky note sits on a photograph", async () => {
    const note = await maya.json<{ note: { id: string } }>("/api/photo-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.picnic, text: "Mother cuts the Sunday rolls", x: 42, y: 28 }),
    });
    assert.equal(note.status, 200, note.body.error);
    const page = await maya.html(`/archive/${ids.picnic}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /Mother cuts the Sunday rolls/);
    const index = await maya.html("/photos/notes");
    assert.match(index.text, /Mother cuts the Sunday rolls/);
  });

  await t.test("a living adult is left off a share link until they consent", async () => {
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
    const share = await maya.json<{ link: { token: string } }>("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "album", entityId: album.body.album.id }),
    });
    assert.equal(share.status, 200, share.body.error);
    const guest = new ApiClient();
    const before = await guest.html(`/s/${share.body.link.token}`);
    assert.equal(before.status, 200);
    assert.doesNotMatch(before.text, /Whitaker picnic/);
    const consent = await maya.json("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.helen, granted: true, notes: "Helen said the picnic may be shared." }),
    });
    assert.equal(consent.status, 200, consent.body.error);
    const after = await guest.html(`/s/${share.body.link.token}`);
    assert.match(after.text, /Whitaker picnic/);
    const dashboard = await maya.html("/consent");
    assert.match(dashboard.text, /Helen Park/);
    const blocked = await viewer.json("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.maya, granted: true }),
    });
    assert.equal(blocked.status, 403);
  });

  await t.test("a life reads as one continuous story", async () => {
    const reading = await maya.json<{ reading: { title: string; text: string } }>(`/api/people/${ids.rose}/read`);
    assert.equal(reading.status, 200, reading.body.error);
    assert.match(reading.body.reading.title, /Rose Whitaker/);
    assert.match(reading.body.reading.text, /navy hatband|Sunday rolls|millinery/i);
    const page = await maya.html(`/people/${ids.rose}/read`);
    assert.equal(page.status, 200);
    assert.match(page.text, /The life of Rose Whitaker|life-reading/);
    assert.match(page.text, /Sunday rolls|millinery|navy hatband/i);
    const hidden = await viewer.html(`/people/${ids.helen}/read`);
    assert.doesNotMatch(hidden.text, /1954-09-22/);
  });

  await t.test("source extracts gather the new records", async () => {
    const page = await maya.html("/extracts");
    assert.equal(page.status, 200);
    assert.match(page.text, /Census households|Church registers|Tax lists|Passenger lists/);
  });
});
