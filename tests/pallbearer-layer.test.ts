import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can record pallbearers, a gown chain, and the unused farm pages", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("pallbearer-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker pallbearers",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("pallbearer-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a funeral, a class, and a photograph entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
      { key: "blank", displayName: "Cousin Ned", givenName: "Ned", familyName: "Whitaker" },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    await maya.json("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june }),
    });
    const rosePhoto = new FormData();
    rosePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
    rosePhoto.set("title", "Rose at the Grange hall");
    rosePhoto.set("capturedAt", "1947-10-18T20:00:00Z");
    rosePhoto.set("personIds", ids.rose);
    const savedRose = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: rosePhoto });
    ids.rosePhoto = savedRose.body.asset.id;
    const taught = await maya.json<{ class: { id: string } }>("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school: "Cedar Falls High",
        year: 1984,
        place: "Cedar Falls, Iowa",
        personIds: [ids.blank],
        teacherId: ids.june,
      }),
    });
    assert.equal(taught.status, 200, taught.body.error);
    ids.class1984 = taught.body.class.id;
    const lonely = await maya.json<{ class: { id: string } }>("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school: "Cedar Falls High",
        year: 1945,
        place: "Cedar Falls, Iowa",
        personIds: [ids.rose],
      }),
    });
    ids.class1945 = lonely.body.class.id;
  });

  await t.test("a funeral pallbearer list keeps each role and leaves the program heading alone", async () => {
    const head = await maya.json<{ line: string }>("/api/pallbearers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deceasedId: ids.rose, personId: ids.june, role: "head" }),
    });
    assert.equal(head.status, 200, head.body.error);
    assert.match(head.body.line, /June Whitaker/);
    await maya.json("/api/pallbearers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deceasedId: ids.rose, personId: ids.blank, role: "left" }),
    });
    const page = await maya.html("/pallbearers");
    assert.match(page.text, /pallbearers-heading/);
    assert.match(page.text, /June Whitaker/);
    assert.match(page.text, /head/);
    const funeral = await maya.html(`/people/${ids.rose}/funeral`);
    assert.match(funeral.text, /funeral-heading/);
    assert.match(funeral.text, /pallbearers-link/);
    const funerals = await maya.html("/funerals");
    assert.match(funerals.text, /funerals-heading/);
    const missing = await maya.html("/pallbearers/missing");
    assert.match(missing.text, /missing-pallbearers-heading/);
    assert.match(missing.text, /Louis Whitaker/);
  });

  await t.test("a christening-gown chain lists wearers in date order", async () => {
    const gown = await maya.json<{ gown: { id: string } }>("/api/gowns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Whitaker christening gown" }),
    });
    assert.equal(gown.status, 200, gown.body.error);
    ids.gown = gown.body.gown.id;
    await maya.json("/api/gowns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gownId: ids.gown, personId: ids.june, wornOn: "1956-04-01" }),
    });
    await maya.json("/api/gowns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gownId: ids.gown, personId: ids.rose, wornOn: "1929-03-08" }),
    });
    const page = await maya.html("/gowns");
    assert.match(page.text, /gowns-heading/);
    assert.match(page.text, /gown-chain/);
    assert.match(page.text, /1929-03-08[\s\S]*1956-04-01/);
    const one = await maya.html(`/gowns/${ids.gown}`);
    assert.match(one.text, /gown-heading/);
    assert.match(one.text, /1929-03-08[\s\S]*1956-04-01/);
  });

  await t.test("ice harvest and threshing stand in for hymn and apprenticeship pages that already exist", async () => {
    const ice = await maya.json<{ line: string }>("/api/ice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, year: 1947, place: "Cedar River", role: "pike" }),
    });
    assert.equal(ice.status, 200, ice.body.error);
    const ring = await maya.json<{ line: string }>("/api/threshing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, year: 1948, place: "North farm", role: "bundle pitcher" }),
    });
    assert.equal(ring.status, 200, ring.body.error);
    const icePage = await maya.html("/ice");
    assert.match(icePage.text, /ice-heading/);
    assert.match(icePage.text, /pike/);
    const hymns = await maya.html("/hymns");
    assert.match(hymns.text, /hymns-heading/);
    const threshing = await maya.html("/threshing");
    assert.match(threshing.text, /threshing-heading/);
    assert.match(threshing.text, /bundle pitcher/);
    const apprentices = await maya.html("/apprentices");
    assert.match(apprentices.text, /apprentices-heading/);
  });

  await t.test("who held the camera stays off the sitter list", async () => {
    const saved = await maya.json<{ line: string }>("/api/cameras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.rosePhoto, personId: ids.june }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /June Whitaker/);
    const page = await maya.html("/cameras");
    assert.match(page.text, /cameras-heading/);
    assert.match(page.text, /held the camera/);
    const sitters = await maya.html("/sitters");
    assert.match(sitters.text, /sitters-heading/);
  });

  await t.test("surname spelling variants stay with the record they came from", async () => {
    const saved = await maya.json<{ line: string }>("/api/spellings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surname: "Whitaker", variant: "Whiticker", source: "1930 census" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    const page = await maya.html("/spellings");
    assert.match(page.text, /spellings-heading/);
    assert.match(page.text, /Whiticker/);
  });

  await t.test("a last-seen date writes onto the person", async () => {
    const saved = await maya.json<{ line: string }>("/api/last-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, lastSeenOn: "2008-10-01" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    await maya.json("/api/people/" + ids.june, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastSeenOn: "2026-09-01" }),
    });
    const page = await maya.html("/last-seen");
    assert.match(page.text, /last-seen-heading/);
    assert.match(page.text, /Rose Whitaker/);
    const person = await maya.html(`/people/${ids.rose}`);
    assert.match(person.text, /last-seen/);
    const missing = await maya.html("/last-seen/missing");
    assert.match(missing.text, /missing-last-seen-heading/);
    assert.match(missing.text, /Cousin Ned|Louis Whitaker/);
  });

  await t.test("the schoolteacher is additive on a class that already has pupils", async () => {
    const page = await maya.html("/teachers");
    assert.match(page.text, /teachers-heading/);
    assert.match(page.text, /June Whitaker/);
    const classes = await maya.html("/classes");
    assert.match(classes.text, /classes-heading/);
    const one = await maya.html(`/classes/${ids.class1984}`);
    assert.match(one.text, /class-heading/);
    assert.match(one.text, /class-teacher/);
    const missing = await maya.html("/teachers/missing");
    assert.match(missing.text, /missing-teachers-heading/);
    assert.match(missing.text, /1945/);
  });

  await t.test("a family vehicle log keeps the years owned", async () => {
    const saved = await maya.json<{ line: string }>("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "North-farm truck",
        kind: "truck",
        personId: ids.louis,
        startedOn: "1952-01-01",
        endedOn: "1978-12-31",
      }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /1952/);
    const page = await maya.html("/vehicles");
    assert.match(page.text, /vehicles-heading/);
    assert.match(page.text, /North-farm truck/);
  });

  await t.test("a party line stays off the phone-tree heading", async () => {
    const saved = await maya.json<{ text: string }>("/api/party-lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exchange: "Cedar Falls",
        number: "4-218",
        personIds: [ids.rose, ids.louis],
      }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.text, /4-218/);
    const page = await maya.html("/party-lines");
    assert.match(page.text, /party-lines-heading/);
    assert.match(page.text, /4-218/);
    const tree = await maya.html("/phone-tree");
    assert.match(tree.text, /phone-tree-heading/);
  });

  await t.test("milk route, rented pew, grave blanket, and elevator account fill the leftover farm book", async () => {
    const route = await maya.json<{ route: { id: string } }>("/api/milk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Cedar Falls dairy", year: 1961 }),
    });
    assert.equal(route.status, 200, route.body.error);
    const stop = await maya.json<{ line: string }>("/api/milk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeId: route.body.route.id, personId: ids.louis, stopOrder: 1 }),
    });
    assert.equal(stop.status, 200, stop.body.error);
    const pew = await maya.json<{ line: string }>("/api/pews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, church: "St. John's", pewNumber: "12" }),
    });
    assert.equal(pew.status, 200, pew.body.error);
    const blanket = await maya.json<{ line: string }>("/api/blankets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, monthDay: "December 24", placedById: ids.june }),
    });
    assert.equal(blanket.status, 200, blanket.body.error);
    const elevator = await maya.json<{ line: string }>("/api/elevators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.louis,
        elevator: "Cedar Falls Co-op",
        account: "Whitaker 14",
        year: 1952,
      }),
    });
    assert.equal(elevator.status, 200, elevator.body.error);
    const milk = await maya.html("/milk");
    assert.match(milk.text, /milk-heading/);
    assert.match(milk.text, /Stop 1/);
    const pews = await maya.html("/pews");
    assert.match(pews.text, /pews-heading/);
    assert.match(pews.text, /pew 12/);
    const blankets = await maya.html("/blankets");
    assert.match(blankets.text, /blankets-heading/);
    assert.match(blankets.text, /December 24/);
    const elevators = await maya.html("/elevators");
    assert.match(elevators.text, /elevators-heading/);
    assert.match(elevators.text, /Whitaker 14/);
    const abstracts = await maya.html("/abstracts");
    assert.match(abstracts.text, /abstracts-heading/);
  });

  await t.test("viewers can read the new pages and quiet start-here stay the same", async () => {
    const pallbearers = await viewer.html("/pallbearers");
    assert.match(pallbearers.text, /June Whitaker/);
    const denied = await viewer.json("/api/pallbearers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deceasedId: ids.rose, personId: ids.june, role: "honorary" }),
    });
    assert.equal(denied.status, 403);
    const start = await maya.json<{ steps: { id: string }[] }>("/api/start");
    assert.equal(start.body.steps.length, 3);
    const quiet = await maya.html("/quiet");
    assert.match(quiet.text, /quiet/);
  });
});
