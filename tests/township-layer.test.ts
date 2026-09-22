import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";

const PASSWORD = "millinery-1952";

test("a relative can record fence walks, road tax, and unused township pages", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("township-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker township",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("township-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
      { key: "ned", displayName: "Cousin Ned", givenName: "Ned", familyName: "Whitaker" },
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
  });

  await t.test("a fence-viewer appointment keeps who walked the line", async () => {
    const fence = await maya.json<{ line: string }>("/api/fences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, neighbors: "Whitaker and Chen", walkedOn: "1949-04-12" }),
    });
    assert.equal(fence.status, 200, fence.body.error);
    const page = await maya.html("/fences");
    assert.match(page.text, /fences-heading/);
    assert.match(page.text, /Whitaker and Chen/);
    assert.match(page.text, /1949-04-12/);
  });

  await t.test("road tax keeps the road and the days", async () => {
    const tax = await maya.json<{ line: string }>("/api/road-tax", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, road: "north township road", days: 3, year: 1952 }),
    });
    assert.equal(tax.status, 200, tax.body.error);
    const page = await maya.html("/road-tax");
    assert.match(page.text, /road-tax-heading/);
    assert.match(page.text, /north township road/);
    assert.match(page.text, /3 days/);
  });

  await t.test("a creamery check keeps pounds and amount", async () => {
    const check = await maya.json<{ line: string }>("/api/creamery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, pounds: "40 pounds", amount: "$8.20", paidOn: "1961-06-15" }),
    });
    assert.equal(check.status, 200, check.body.error);
    const page = await maya.html("/creamery");
    assert.match(page.text, /creamery-heading/);
    assert.match(page.text, /40 pounds/);
    assert.match(page.text, /\$8\.20/);
  });

  await t.test("a lightning-rod installer names the building", async () => {
    const rod = await maya.json<{ line: string }>("/api/rods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, building: "north-farm barn", year: 1949 }),
    });
    assert.equal(rod.status, 200, rod.body.error);
    const page = await maya.html("/rods");
    assert.match(page.text, /rods-heading/);
    assert.match(page.text, /north-farm barn/);
  });

  await t.test("a maple-sugar camp keeps who boiled and the gallons", async () => {
    const camp = await maya.json<{ line: string }>("/api/maple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, gallons: "12 gallons", year: 1951, place: "north-farm grove" }),
    });
    assert.equal(camp.status, 200, camp.body.error);
    const page = await maya.html("/maple");
    assert.match(page.text, /maple-heading/);
    assert.match(page.text, /12 gallons/);
  });

  await t.test("a husking bee lists who came and whose field, separate from quilting bees", async () => {
    const bee = await maya.json<{ bee: { id: string } }>("/api/husking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: ids.louis, heldOn: "1950-10-20", place: "North farm" }),
    });
    assert.equal(bee.status, 200, bee.body.error);
    ids.husking = bee.body.bee.id;
    await maya.json("/api/husking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beeId: ids.husking, personId: ids.ned }),
    });
    await maya.json("/api/husking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beeId: ids.husking, personId: ids.june }),
    });
    await maya.json("/api/husking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: ids.rose, heldOn: "1951-10-18" }),
    });
    const page = await maya.html("/husking");
    assert.match(page.text, /husking-heading/);
    assert.match(page.text, /Louis Whitaker/);
    assert.match(page.text, /Cousin Ned[\s\S]*June Whitaker|June Whitaker[\s\S]*Cousin Ned/);
    const bees = await maya.html("/bees");
    assert.match(bees.text, /bees-heading/);
    const missing = await maya.html("/husking/missing");
    assert.match(missing.text, /missing-husking-heading/);
    assert.match(missing.text, /Rose Whitaker/);
  });

  await t.test("a midwife record leaves baptisms alone", async () => {
    const midwife = await maya.json<{ line: string }>("/api/midwives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        midwifeId: ids.rose,
        motherId: ids.june,
        childId: ids.ned,
        attendedOn: "1984-07-21",
      }),
    });
    assert.equal(midwife.status, 200, midwife.body.error);
    const page = await maya.html("/midwives");
    assert.match(page.text, /midwives-heading/);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /June Whitaker/);
    const baptisms = await maya.html("/baptisms");
    assert.match(baptisms.text, /baptisms-heading/);
  });

  await t.test("who carved the headstone leaves inscriptions alone", async () => {
    const carver = await maya.json<{ line: string }>("/api/carvers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carverId: ids.june, personId: ids.rose, yard: "Fairview" }),
    });
    assert.equal(carver.status, 200, carver.body.error);
    const page = await maya.html("/carvers");
    assert.match(page.text, /carvers-heading/);
    assert.match(page.text, /Fairview/);
    const inscriptions = await maya.html("/inscriptions");
    assert.match(inscriptions.text, /inscriptions-heading/);
  });

  await t.test("a charivari lists who came and what they brought, and leaves weddings alone", async () => {
    const event = await maya.json<{ charivari: { id: string } }>("/api/charivari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Chen wedding", heldOn: "1978-06-10" }),
    });
    assert.equal(event.status, 200, event.body.error);
    ids.charivari = event.body.charivari.id;
    await maya.json("/api/charivari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ charivariId: ids.charivari, personId: ids.louis, noise: "a tin pan" }),
    });
    await maya.json("/api/charivari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ charivariId: ids.charivari, personId: ids.june, noise: "a cowbell" }),
    });
    await maya.json("/api/charivari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Quiet wedding" }),
    });
    const page = await maya.html("/charivari");
    assert.match(page.text, /charivari-heading/);
    assert.match(page.text, /tin pan/);
    assert.match(page.text, /cowbell/);
    const weddings = await maya.html("/weddings");
    assert.match(weddings.text, /weddings-heading/);
    const missing = await maya.html("/charivari/missing");
    assert.match(missing.text, /missing-charivari-heading/);
    assert.match(missing.text, /Quiet wedding/);
  });

  await t.test("a cattle brand keeps the mark and the years", async () => {
    const brand = await maya.json<{ line: string }>("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.louis,
        mark: "H-bar",
        startedOn: "1949-01-01",
        endedOn: "1978-12-31",
      }),
    });
    assert.equal(brand.status, 200, brand.body.error);
    const page = await maya.html("/brands");
    assert.match(page.text, /brands-heading/);
    assert.match(page.text, /H-bar/);
    assert.match(page.text, /1949/);
    assert.match(page.text, /1978/);
  });

  await t.test("sorghum, sick-watch, and a school-board term ship from the unused list", async () => {
    const sorghum = await maya.json<{ line: string }>("/api/sorghum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, gallons: "8 gallons", year: 1950, place: "north farm" }),
    });
    assert.equal(sorghum.status, 200, sorghum.body.error);
    const sick = await maya.json<{ line: string }>("/api/sick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sickId: ids.rose, personId: ids.june, satOn: "2008-10-01" }),
    });
    assert.equal(sick.status, 200, sick.body.error);
    const board = await maya.json<{ line: string }>("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.louis,
        office: "director",
        startedOn: "1952-01-01",
        endedOn: "1958-12-31",
      }),
    });
    assert.equal(board.status, 200, board.body.error);
    const sorghumPage = await maya.html("/sorghum");
    assert.match(sorghumPage.text, /sorghum-heading/);
    assert.match(sorghumPage.text, /8 gallons/);
    const sickPage = await maya.html("/sick");
    assert.match(sickPage.text, /sick-heading/);
    assert.match(sickPage.text, /2008-10-01/);
    const watches = await maya.html("/watches");
    assert.match(watches.text, /watches-heading/);
    const boards = await maya.html("/boards");
    assert.match(boards.text, /boards-heading/);
    assert.match(boards.text, /director/);
  });

  await t.test("viewers can read the new pages and quiet start-here stay the same", async () => {
    const fences = await viewer.html("/fences");
    assert.match(fences.text, /Louis Whitaker/);
    const denied = await viewer.json("/api/fences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, neighbors: "Should not save" }),
    });
    assert.equal(denied.status, 403);
    const start = await maya.json<{ steps: { id: string }[] }>("/api/start");
    assert.equal(start.body.steps.length, 3);
    const quiet = await maya.html("/quiet");
    assert.match(quiet.text, /quiet/);
  });
});
