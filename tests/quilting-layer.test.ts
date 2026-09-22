import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";

const PASSWORD = "millinery-1952";

test("a relative can record a quilting bee, a bell, and the unused household pages", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("quilting-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker quilting",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("quilting-viewer");
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

  await t.test("a quilting-bee roll keeps who came and which block, and leaves quilts alone", async () => {
    const bee = await maya.json<{ bee: { id: string } }>("/api/bees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Harvest ring bee", heldOn: "1952-04-12", place: "North farm parlor" }),
    });
    assert.equal(bee.status, 200, bee.body.error);
    ids.bee = bee.body.bee.id;
    await maya.json("/api/bees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beeId: ids.bee, personId: ids.june, block: "nine-patch" }),
    });
    const first = await maya.json<{ line: string }>("/api/bees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beeId: ids.bee, personId: ids.rose, block: "Ohio star" }),
    });
    assert.equal(first.status, 200, first.body.error);
    assert.match(first.body.line, /Rose Whitaker/);
    await maya.json("/api/bees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Lonely winter bee" }),
    });
    const page = await maya.html("/bees");
    assert.match(page.text, /bees-heading/);
    assert.match(page.text, /Ohio star[\s\S]*nine-patch|Rose Whitaker[\s\S]*June Whitaker/);
    const quilts = await maya.html("/quilts");
    assert.match(quilts.text, /quilts-heading/);
    const missing = await maya.html("/bees/missing");
    assert.match(missing.text, /missing-bees-heading/);
    assert.match(missing.text, /Lonely winter bee/);
  });

  await t.test("who rang the church bell keeps the service", async () => {
    const bell = await maya.json<{ line: string }>("/api/bells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, service: "Sunday morning", rangOn: "1948-06-14" }),
    });
    assert.equal(bell.status, 200, bell.body.error);
    const page = await maya.html("/bells");
    assert.match(page.text, /bells-heading/);
    assert.match(page.text, /Sunday morning/);
    assert.match(page.text, /1948-06-14/);
  });

  await t.test("a box-social pairing names who bought whose box", async () => {
    const social = await maya.json<{ line: string }>("/api/socials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerId: ids.ned, sellerId: ids.june, heldOn: "1968-10-12", price: "35 cents" }),
    });
    assert.equal(social.status, 200, social.body.error);
    const page = await maya.html("/socials");
    assert.match(page.text, /socials-heading/);
    assert.match(page.text, /Cousin Ned/);
    assert.match(page.text, /June Whitaker/);
    assert.match(page.text, /35 cents/);
  });

  await t.test("a rural mail route keeps the carrier, boxes, and days", async () => {
    const route = await maya.json<{ route: { id: string } }>("/api/mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Rural Route 2", days: "Tue Thu Sat", carrierId: ids.louis }),
    });
    assert.equal(route.status, 200, route.body.error);
    ids.mail = route.body.route.id;
    await maya.json("/api/mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeId: ids.mail, personId: ids.rose, boxNumber: "14" }),
    });
    const page = await maya.html("/mail");
    assert.match(page.text, /mail-heading/);
    assert.match(page.text, /Rural Route 2/);
    assert.match(page.text, /Tue Thu Sat/);
    assert.match(page.text, /Box 14/);
  });

  await t.test("a household wash-day schedule keeps the weekday", async () => {
    const wash = await maya.json<{ line: string }>("/api/wash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, weekday: "Monday" }),
    });
    assert.equal(wash.status, 200, wash.body.error);
    const page = await maya.html("/wash");
    assert.match(page.text, /wash-heading/);
    assert.match(page.text, /Monday/);
  });

  await t.test("a spring seed order keeps variety, quantity, and supplier", async () => {
    const seed = await maya.json<{ line: string }>("/api/seeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.louis,
        variety: "Early Ohio potatoes",
        quantity: "2 sacks",
        supplier: "Iowa Seed Co.",
        year: 1952,
      }),
    });
    assert.equal(seed.status, 200, seed.body.error);
    const page = await maya.html("/seeds");
    assert.match(page.text, /seeds-heading/);
    assert.match(page.text, /Early Ohio potatoes/);
    assert.match(page.text, /2 sacks/);
    assert.match(page.text, /Iowa Seed Co/);
  });

  await t.test("a barn-raising crew lists each person’s job in job order", async () => {
    const barn = await maya.json<{ barn: { id: string } }>("/api/barns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "North-farm barn", heldOn: "1949-06-18", place: "North farm" }),
    });
    assert.equal(barn.status, 200, barn.body.error);
    ids.barn = barn.body.barn.id;
    await maya.json("/api/barns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisingId: ids.barn, personId: ids.louis, job: "frame" }),
    });
    await maya.json("/api/barns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisingId: ids.barn, personId: ids.june, job: "rafter" }),
    });
    await maya.json("/api/barns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raisingId: ids.barn, personId: ids.ned, job: "peg" }),
    });
    const page = await maya.html("/barns");
    assert.match(page.text, /barns-heading/);
    assert.match(page.text, /frame[\s\S]*peg[\s\S]*rafter/);
    const one = await maya.html(`/barns/${ids.barn}`);
    assert.match(one.text, /barn-heading/);
    assert.match(one.text, /frame[\s\S]*peg[\s\S]*rafter/);
  });

  await t.test("a confirmation-class roll stays apart from school classes", async () => {
    const row = await maya.json<{ class: { id: string } }>("/api/confirmations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ church: "St. John's", year: 1945 }),
    });
    assert.equal(row.status, 200, row.body.error);
    ids.confirm = row.body.class.id;
    await maya.json("/api/confirmations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: ids.confirm, personId: ids.rose }),
    });
    await maya.json("/api/confirmations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ church: "St. John's", year: 1946 }),
    });
    const page = await maya.html("/confirmations");
    assert.match(page.text, /confirmations-heading/);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /1945/);
    const classes = await maya.html("/classes");
    assert.match(classes.text, /classes-heading/);
    const missing = await maya.html("/confirmations/missing");
    assert.match(missing.text, /missing-confirmations-heading/);
    assert.match(missing.text, /1946/);
  });

  await t.test("who sat the deathwatch leaves funeral headings alone", async () => {
    const watch = await maya.json<{ line: string }>("/api/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deceasedId: ids.rose, personId: ids.june, watchedOn: "2008-11-01" }),
    });
    assert.equal(watch.status, 200, watch.body.error);
    const page = await maya.html("/watches");
    assert.match(page.text, /watches-heading/);
    assert.match(page.text, /June Whitaker/);
    assert.match(page.text, /2008-11-01/);
    const funerals = await maya.html("/funerals");
    assert.match(funerals.text, /funerals-heading/);
    const funeral = await maya.html(`/people/${ids.rose}/funeral`);
    assert.match(funeral.text, /funeral-heading/);
    assert.match(funeral.text, /deathwatch-link/);
    const missing = await maya.html("/watches/missing");
    assert.match(missing.text, /missing-watches-heading/);
    assert.match(missing.text, /Louis Whitaker/);
  });

  await t.test("a butter-and-egg account keeps the store book", async () => {
    const account = await maya.json<{ line: string }>("/api/butter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, store: "Market Street", account: "Whitaker 3", year: 1961 }),
    });
    assert.equal(account.status, 200, account.body.error);
    const page = await maya.html("/butter");
    assert.match(page.text, /butter-heading/);
    assert.match(page.text, /Market Street/);
    assert.match(page.text, /Whitaker 3/);
  });

  await t.test("well depth, parlor organ, and a Sunday-school pin ship from the unused list", async () => {
    const well = await maya.json<{ line: string }>("/api/wells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, place: "north farm", depth: "42 feet", year: 1949 }),
    });
    assert.equal(well.status, 200, well.body.error);
    const organ = await maya.json<{ line: string }>("/api/organs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, title: "cottage organ", place: "north-farm parlor" }),
    });
    assert.equal(organ.status, 200, organ.body.error);
    const pin = await maya.json<{ line: string }>("/api/sunday-pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, year: 1996, church: "St. John's" }),
    });
    assert.equal(pin.status, 200, pin.body.error);
    const wells = await maya.html("/wells");
    assert.match(wells.text, /wells-heading/);
    assert.match(wells.text, /42 feet/);
    const organs = await maya.html("/organs");
    assert.match(organs.text, /organs-heading/);
    assert.match(organs.text, /cottage organ/);
    const pins = await maya.html("/pins");
    assert.match(pins.text, /pins-heading/);
    assert.match(pins.text, /1996/);
    const mapPins = await maya.html("/map/pins");
    assert.match(mapPins.text, /place-pins-heading/);
  });

  await t.test("viewers can read the new pages and quiet start-here stay the same", async () => {
    const bees = await viewer.html("/bees");
    assert.match(bees.text, /Rose Whitaker/);
    const denied = await viewer.json("/api/bees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Should not save" }),
    });
    assert.equal(denied.status, 403);
    const start = await maya.json<{ steps: { id: string }[] }>("/api/start");
    assert.equal(start.body.steps.length, 3);
    const quiet = await maya.html("/quiet");
    assert.match(quiet.text, /quiet/);
    const witnesses = await maya.html("/witnesses");
    assert.match(witnesses.text, /witnesses-heading/);
    const baptisms = await maya.html("/baptisms");
    assert.match(baptisms.text, /baptisms-heading/);
  });
});
