import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can seal a capsule, interview an elder, and keep later family records", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("capsule-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker capsule",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("time-capsule letter is dated, addressed, and findable by Ask", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
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
    const sealed = await maya.json<{ capsule: { id: string; addresseeName: string } }>("/api/capsules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Rose’s letter for Maya, to open in 2047",
        body: "Maya, if you still keep the navy hatband, remember the millinery counter on Market Street.",
        writtenAt: "1952-06-14",
        openOn: "2047-06-14",
        addresseeName: "Maya Park",
        addresseePersonId: ids.maya,
        fromPersonId: ids.rose,
        personIds: [ids.rose, ids.maya],
      }),
    });
    assert.equal(sealed.status, 200, sealed.body.error);
    ids.capsule = sealed.body.capsule.id;
    assert.equal(sealed.body.capsule.addresseeName, "Maya Park");
    const page = await maya.html("/capsules");
    assert.match(page.text, /Maya Park/);
    assert.match(page.text, /2047/);
    const asked = await maya.json<{ answer: string; sources: { title: string }[] }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What should Maya remember about the navy hatband?" }),
    });
    assert.equal(asked.status, 200, asked.body.error);
    assert.match(`${asked.body.answer} ${asked.body.sources.map((source) => source.title).join(" ")}`, /navy hatband|Maya|millinery|capsule/i);
  });

  await t.test("elder interview answers become stories", async () => {
    const answered = await maya.json<{ answer: { question: string }; story: { body: string } }>("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        promptKey: "meet",
        body: "I met Louis at the millinery counter. He bought a navy hatband.",
      }),
    });
    assert.equal(answered.status, 200, answered.body.error);
    assert.match(answered.body.answer.question, /married/);
    assert.match(answered.body.story.body, /navy hatband/);
    const page = await maya.html(`/interviews?personId=${ids.rose}`);
    assert.match(page.text, /navy hatband/);
    assert.match(page.text, /How did you meet the person you married/);
  });

  await t.test("edit history records who changed a name, date, or relationship", async () => {
    const renamed = await maya.json("/api/people/" + ids.rose, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Rose Whitaker Park", deathDate: "2008-11-03" }),
    });
    assert.equal(renamed.status, 200, renamed.body.error);
    const rel = await maya.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1952-06-14" }),
    });
    assert.equal(rel.status, 200, rel.body.error);
    const history = await maya.json<{ changes: { field: string; after: string | null; actor: { name: string } }[] }>(
      `/api/people/${ids.rose}/changes`,
    );
    assert.equal(history.status, 200, history.body.error);
    assert.ok(history.body.changes.some((change) => change.field === "name" && change.after === "Rose Whitaker Park"));
    assert.ok(history.body.changes.some((change) => change.field === "deathDate" && change.after === "2008-11-03"));
    assert.ok(history.body.changes.some((change) => change.field === "relationship"));
    const page = await maya.html(`/people/${ids.rose}/history`);
    assert.match(page.text, /Rose Whitaker Park/);
    assert.match(page.text, /Maya Park/);
  });

  await t.test("named branches filter the tree and timeline", async () => {
    const branch = await maya.json<{ branch: { id: string } }>("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "the Cedar Falls Harts",
        summary: "The Iowa line",
        personIds: [ids.rose, ids.louis],
      }),
    });
    assert.equal(branch.status, 200, branch.body.error);
    ids.branch = branch.body.branch.id;
    const tree = await maya.html(`/tree?branchId=${ids.branch}`);
    assert.match(tree.text, /Rose Whitaker/);
    assert.match(tree.text, /the Cedar Falls Harts/);
    const timeline = await maya.html(`/timeline?branchId=${ids.branch}`);
    assert.match(timeline.text, /the Cedar Falls Harts|Rose Whitaker/);
  });

  await t.test("cemetery pages, then-and-now, bibliography, voyage, school, and reunion", async () => {
    const cemetery = await maya.json<{ cemetery: { id: string } }>("/api/cemeteries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Fairview Cemetery",
        locality: "Cedar Falls",
        region: "Iowa",
        country: "United States",
      }),
    });
    assert.equal(cemetery.status, 200, cemetery.body.error);
    ids.cemetery = cemetery.body.cemetery.id;
    const plot = await maya.json("/api/cemeteries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cemeteryId: ids.cemetery, personId: ids.rose, plot: "Lot 14" }),
    });
    assert.equal(plot.status, 200, plot.body.error);
    const cemeteryPage = await maya.html(`/cemeteries/${ids.cemetery}`);
    assert.match(cemeteryPage.text, /Fairview Cemetery/);
    assert.match(cemeteryPage.text, /Lot 14/);
    assert.match(cemeteryPage.text, /Rose Whitaker/);

    const thenPhoto = new FormData();
    thenPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "then.svg");
    thenPhoto.set("title", "Market Street, 1952");
    const then = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: thenPhoto });
    assert.equal(then.status, 200, then.body.error);
    const nowPhoto = new FormData();
    nowPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "now.svg");
    nowPhoto.set("title", "Market Street today");
    const now = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: nowPhoto });
    assert.equal(now.status, 200, now.body.error);
    const pair = await maya.json("/api/pairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Market Street, then and now",
        thenAssetId: then.body.asset.id,
        nowAssetId: now.body.asset.id,
      }),
    });
    assert.equal(pair.status, 200, pair.body.error);
    const pairs = await maya.html("/pairs");
    assert.match(pairs.text, /Market Street, then and now/);

    const source = await maya.json("/api/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "They met at the millinery counter.",
        personId: ids.rose,
      }),
    });
    assert.equal(source.status, 200, source.body.error);
    const biblio = await maya.html("/bibliography");
    assert.match(biblio.text, /Source bibliography|Works cited|Claims/);

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
    const voyages = await maya.html("/voyages");
    assert.match(voyages.text, /SS Eastern Star/);
    assert.match(voyages.text, /Hong Kong/);

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
    const schools = await maya.html("/schools");
    assert.match(schools.text, /Cedar Falls High/);

    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker reunion",
        place: "Market Street",
        happenedOn: "2026-07-04",
        personIds: [ids.maya, ids.rose],
      }),
    });
    assert.equal(reunion.status, 200, reunion.body.error);
    ids.reunion = reunion.body.reunion.id;
    const reunionPage = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(reunionPage.text, /Whitaker reunion/);
    assert.match(reunionPage.text, /Maya Park/);
  });

  await t.test("occupations, godparents, congregations, land, military, bible, motto, and passport", async () => {
    const occupation = await maya.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "occupation", personId: ids.louis, title: "Milliner", place: "Market Street", startedOn: "1948-01-01" }),
    });
    assert.equal(occupation.status, 200, occupation.body.error);
    const godparent = await maya.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "godparent", childId: ids.maya, godparentId: ids.rose }),
    });
    assert.equal(godparent.status, 200, godparent.body.error);
    const congregation = await maya.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "congregation", personId: ids.rose, name: "St. John's", place: "Cedar Falls" }),
    });
    assert.equal(congregation.status, 200, congregation.body.error);
    const land = await maya.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "land", personId: ids.louis, title: "North farm", place: "Cedar Falls, Iowa" }),
    });
    assert.equal(land.status, 200, land.body.error);
    const military = await maya.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "military", personId: ids.louis, branch: "Army", startedOn: "1944-09-01" }),
    });
    assert.equal(military.status, 200, military.body.error);
    const bible = await maya.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "bible", title: "Whitaker Bible", holderId: ids.rose, body: "Married at St. John's." }),
    });
    assert.equal(bible.status, 200, bible.body.error);
    const motto = await maya.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "motto", text: "Courtesy to the trees" }),
    });
    assert.equal(motto.status, 200, motto.body.error);
    const passport = await maya.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "passport", personId: ids.louis, place: "Hong Kong", issuedOn: "1972-02-10" }),
    });
    assert.equal(passport.status, 200, passport.body.error);

    const occupations = await maya.html("/occupations");
    assert.match(occupations.text, /Milliner/);
    const godparents = await maya.html("/godparents");
    assert.match(godparents.text, /Rose Whitaker/);
    const congregations = await maya.html("/congregations");
    assert.match(congregations.text, /St. John's/);
    const landPage = await maya.html("/land");
    assert.match(landPage.text, /North farm/);
    const militaryPage = await maya.html("/military");
    assert.match(militaryPage.text, /Army/);
    const bibles = await maya.html("/bibles");
    assert.match(bibles.text, /Whitaker Bible/);
    const mottos = await maya.html("/mottos");
    assert.match(mottos.text, /Courtesy to the trees/);
    const passports = await maya.html("/passports");
    assert.match(passports.text, /Louis Whitaker/);
  });
});
