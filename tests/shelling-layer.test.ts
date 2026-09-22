import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";

const PASSWORD = "millinery-1952";

test("a relative can record corn-shelling, horse teams, and unused crib pages", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("shelling-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker shelling",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("shelling-viewer");
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

  await t.test("a corn-shelling bee lists who came and whose crib, separate from husking", async () => {
    const bee = await maya.json<{ bee: { id: string } }>("/api/shelling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: ids.louis, heldOn: "1950-11-12", place: "North farm" }),
    });
    assert.equal(bee.status, 200, bee.body.error);
    ids.shelling = bee.body.bee.id;
    await maya.json("/api/shelling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beeId: ids.shelling, personId: ids.ned }),
    });
    await maya.json("/api/shelling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beeId: ids.shelling, personId: ids.june }),
    });
    await maya.json("/api/shelling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: ids.rose, heldOn: "1951-11-18" }),
    });
    const page = await maya.html("/shelling");
    assert.match(page.text, /shelling-heading/);
    assert.match(page.text, /Louis Whitaker/);
    assert.match(page.text, /Cousin Ned[\s\S]*June Whitaker|June Whitaker[\s\S]*Cousin Ned/);
    const husking = await maya.html("/husking");
    assert.match(husking.text, /husking-heading/);
    const bees = await maya.html("/bees");
    assert.match(bees.text, /bees-heading/);
    const missing = await maya.html("/shelling/missing");
    assert.match(missing.text, /missing-shelling-heading/);
    assert.match(missing.text, /Rose Whitaker/);
  });

  await t.test("who loaned the team keeps lender, borrower, and purpose", async () => {
    const team = await maya.json<{ line: string }>("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lenderId: ids.louis, borrowerId: ids.ned, purpose: "harvest hauling", loanedOn: "1950-10-08" }),
    });
    assert.equal(team.status, 200, team.body.error);
    const page = await maya.html("/teams");
    assert.match(page.text, /teams-heading/);
    assert.match(page.text, /harvest hauling/);
    assert.match(page.text, /1950-10-08/);
  });

  await t.test("a smokehouse inventory keeps what was hanging", async () => {
    const item = await maya.json<{ line: string }>("/api/smokehouse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, item: "hams", hungOn: "1951-11-20" }),
    });
    assert.equal(item.status, 200, item.body.error);
    const page = await maya.html("/smokehouse");
    assert.match(page.text, /smokehouse-heading/);
    assert.match(page.text, /hams/);
    assert.match(page.text, /Rose Whitaker/);
  });

  await t.test("a mutual-insurance assessment lists the company, the loss, and what each member paid", async () => {
    const assessment = await maya.json<{ assessment: { id: string } }>("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Cedar Falls Farmers Mutual", loss: "barn fire", assessedOn: "1952-03-04" }),
    });
    assert.equal(assessment.status, 200, assessment.body.error);
    ids.assessment = assessment.body.assessment.id;
    await maya.json("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId: ids.assessment, personId: ids.louis, paid: "$4.50" }),
    });
    await maya.json("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId: ids.assessment, personId: ids.rose, paid: "$4.50" }),
    });
    await maya.json("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Quiet Mutual", loss: "hail" }),
    });
    const page = await maya.html("/assessments");
    assert.match(page.text, /assessments-heading/);
    assert.match(page.text, /barn fire/);
    assert.match(page.text, /\$4\.50/);
    const missing = await maya.html("/assessments/missing");
    assert.match(missing.text, /missing-assessments-heading/);
    assert.match(missing.text, /Quiet Mutual/);
  });

  await t.test("a cyclone-cellar list names who sheltered and which storm", async () => {
    const cellar = await maya.json<{ cellar: { id: string } }>("/api/cellars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storm: "1947 tornado", heldOn: "1947-06-21", place: "North farm" }),
    });
    assert.equal(cellar.status, 200, cellar.body.error);
    ids.cellar = cellar.body.cellar.id;
    await maya.json("/api/cellars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cellarId: ids.cellar, personId: ids.rose }),
    });
    await maya.json("/api/cellars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cellarId: ids.cellar, personId: ids.louis }),
    });
    await maya.json("/api/cellars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storm: "Quiet storm" }),
    });
    const page = await maya.html("/cellars");
    assert.match(page.text, /cellars-heading/);
    assert.match(page.text, /1947 tornado/);
    assert.match(page.text, /Rose Whitaker[\s\S]*Louis Whitaker|Louis Whitaker[\s\S]*Rose Whitaker/);
    const missing = await maya.html("/cellars/missing");
    assert.match(missing.text, /missing-cellars-heading/);
    assert.match(missing.text, /Quiet storm/);
  });

  await t.test("who cut the wedding cake leaves weddings alone", async () => {
    const cake = await maya.json<{ line: string }>("/api/cakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cutterId: ids.rose,
        couple: "Margaret and Wei Chen",
        wedding: "Chen wedding",
        cutOn: "1978-06-10",
      }),
    });
    assert.equal(cake.status, 200, cake.body.error);
    const page = await maya.html("/cakes");
    assert.match(page.text, /cakes-heading/);
    assert.match(page.text, /Chen wedding/);
    assert.match(page.text, /Margaret and Wei Chen/);
    const weddings = await maya.html("/weddings");
    assert.match(weddings.text, /weddings-heading/);
  });

  await t.test("a township road district leaves road tax alone", async () => {
    const district = await maya.json<{ line: string }>("/api/districts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.louis,
        district: "District 4",
        startedOn: "1952-01-01",
        endedOn: "1958-12-31",
      }),
    });
    assert.equal(district.status, 200, district.body.error);
    const page = await maya.html("/districts");
    assert.match(page.text, /districts-heading/);
    assert.match(page.text, /District 4/);
    assert.match(page.text, /1952/);
    assert.match(page.text, /1958/);
    const tax = await maya.html("/road-tax");
    assert.match(tax.text, /road-tax-heading/);
  });

  await t.test("a hog-butchering crew lists jobs and leaves barn raisings alone", async () => {
    const crew = await maya.json<{ crew: { id: string } }>("/api/butchering", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "North-farm hog day", heldOn: "1950-12-02", place: "North farm" }),
    });
    assert.equal(crew.status, 200, crew.body.error);
    ids.butchering = crew.body.crew.id;
    await maya.json("/api/butchering", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crewId: ids.butchering, personId: ids.louis, job: "stick" }),
    });
    await maya.json("/api/butchering", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crewId: ids.butchering, personId: ids.ned, job: "scald" }),
    });
    await maya.json("/api/butchering", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crewId: ids.butchering, personId: ids.june, job: "scrape" }),
    });
    await maya.json("/api/butchering", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Quiet hog day" }),
    });
    const page = await maya.html("/butchering");
    assert.match(page.text, /butchering-heading/);
    assert.match(page.text, /scald[\s\S]*scrape[\s\S]*stick/);
    const barns = await maya.html("/barns");
    assert.match(barns.text, /barns-heading/);
    const missing = await maya.html("/butchering/missing");
    assert.match(missing.text, /missing-butchering-heading/);
    assert.match(missing.text, /Quiet hog day/);
  });

  await t.test("a Christmas-program part leaves reunion programs alone", async () => {
    const part = await maya.json<{ line: string }>("/api/recitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.june,
        piece: "Silent Night",
        kind: "recited",
        heldOn: "1992-12-20",
        place: "St. John's",
      }),
    });
    assert.equal(part.status, 200, part.body.error);
    const page = await maya.html("/recitals");
    assert.match(page.text, /recitals-heading/);
    assert.match(page.text, /Silent Night/);
    assert.match(page.text, /recited/);
    const programs = await maya.html("/programs");
    assert.match(programs.text, /programs-heading/);
  });

  await t.test("a peddler visit keeps who stopped and what they sold", async () => {
    const visit = await maya.json<{ line: string }>("/api/peddlers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        peddler: "Watkins",
        goods: "vanilla",
        buyerId: ids.rose,
        visitedOn: "1951-05-14",
      }),
    });
    assert.equal(visit.status, 200, visit.body.error);
    const page = await maya.html("/peddlers");
    assert.match(page.text, /peddlers-heading/);
    assert.match(page.text, /Watkins/);
    assert.match(page.text, /vanilla/);
  });

  await t.test("stray notices, medicine-show purchases, and butter-mold marks ship from the unused list", async () => {
    const stray = await maya.json<{ line: string }>("/api/strays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.louis, animal: "a sow", postedOn: "1950-04-03", place: "North township road" }),
    });
    assert.equal(stray.status, 200, stray.body.error);
    const show = await maya.json<{ line: string }>("/api/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, item: "a tonic", show: "Cedar Falls medicine show", boughtOn: "1953-08-16" }),
    });
    assert.equal(show.status, 200, show.body.error);
    const mold = await maya.json<{ line: string }>("/api/molds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, mark: "H" }),
    });
    assert.equal(mold.status, 200, mold.body.error);
    const strays = await maya.html("/strays");
    assert.match(strays.text, /strays-heading/);
    assert.match(strays.text, /a sow/);
    const shows = await maya.html("/shows");
    assert.match(shows.text, /shows-heading/);
    assert.match(shows.text, /a tonic/);
    const molds = await maya.html("/molds");
    assert.match(molds.text, /molds-heading/);
    assert.match(molds.text, /Rose Whitaker/);
    const butter = await maya.html("/butter");
    assert.match(butter.text, /butter-heading/);
  });

  await t.test("viewers can read the new pages and quiet start-here stay the same", async () => {
    const shelling = await viewer.html("/shelling");
    assert.match(shelling.text, /Louis Whitaker/);
    const denied = await viewer.json("/api/shelling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: ids.louis }),
    });
    assert.equal(denied.status, 403);
    const start = await maya.json<{ steps: { id: string }[] }>("/api/start");
    assert.equal(start.body.steps.length, 3);
    const quiet = await maya.html("/quiet");
    assert.match(quiet.text, /quiet/);
  });
});
