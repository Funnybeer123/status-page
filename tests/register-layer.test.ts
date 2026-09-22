import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can record years married, margin notes, and the unused archive pages", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("register-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker register",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("register-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a dated marriage, a will, a letter, a reunion, and a portrait entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", middleName: "Mae", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
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
    await maya.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPersonId: ids.rose, toPersonId: ids.june, type: "parent" }),
    });
    await maya.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1950-06-14" }),
    });
    await maya.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPersonId: ids.june, toPersonId: ids.blank, type: "partner" }),
    });
    const first = new FormData();
    first.set("title", "Harvest letter");
    first.set("writtenAt", "1947-10-18");
    first.set("transcript", "Cedar Falls, Iowa\n18 October 1947\n\nDearest Ruth,\n\nI danced three times with Samuel Hart.\n\nHe has kind hands, and he calls me Whitaker as if it were a compliment.\n\nYour loving sister,\nEleanor");
    first.set("personIds", ids.rose);
    const savedFirst = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
    ids.letter = savedFirst.body.document.id;
    const prairie = new FormData();
    prairie.set("title", "A note from the prairie");
    prairie.set("writtenAt", "1947-10-20");
    prairie.set("transcript", "The stamp is from a town I cannot place.");
    const savedPrairie = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: prairie });
    ids.prairie = savedPrairie.body.document.id;
    const will = await maya.json<{ will: { id: string } }>("/api/wills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Rose Whitaker’s will",
        body: "The navy hatband goes to June.",
        writtenAt: "2007-11-02",
        personIds: [ids.rose],
      }),
    });
    assert.equal(will.status, 200, will.body.error);
    ids.will = will.body.will.id;
    const lonelyWill = await maya.json<{ will: { id: string } }>("/api/wills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "A will without a witness",
        body: "The farm stays with the children.",
        writtenAt: "2008-01-01",
        personIds: [ids.louis],
      }),
    });
    ids.lonelyWill = lonelyWill.body.will.id;
    const rosePhoto = new FormData();
    rosePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
    rosePhoto.set("title", "Rose at the Grange hall");
    rosePhoto.set("capturedAt", "1947-10-18T20:00:00Z");
    rosePhoto.set("personIds", ids.rose);
    const savedRose = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: rosePhoto });
    ids.rosePhoto = savedRose.body.asset.id;
    const junePhoto = new FormData();
    junePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "june.svg");
    junePhoto.set("title", "June on Market Street");
    junePhoto.set("capturedAt", "1984-06-15T14:00:00Z");
    junePhoto.set("personIds", ids.june);
    const savedJune = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: junePhoto });
    ids.junePhoto = savedJune.body.asset.id;
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker harvest supper",
        place: "Grange hall",
        happenedOn: "2026-10-18",
        personIds: [ids.june, ids.blank],
      }),
    });
    ids.reunion = reunion.body.reunion.id;
    await maya.json("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "A quiet picnic without a program",
        place: "North farm",
        happenedOn: "2026-07-04",
        personIds: [ids.june],
      }),
    });
  });

  await t.test("the wedding-year roll is separate from age at marriage and family hour", async () => {
    const page = await maya.html("/married");
    assert.match(page.text, /married-heading/);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Louis Whitaker/);
    assert.match(page.text, /years married/);
    const marriages = await maya.html("/marriages");
    assert.match(marriages.text, /marriages-heading/);
    const anniversaries = await maya.html("/anniversaries");
    assert.match(anniversaries.text, /anniversaries-heading/);
    const hour = await maya.html("/hour");
    assert.match(hour.text, /family-hour-heading/);
    const longest = await maya.html("/married/longest");
    assert.match(longest.text, /longest-married-heading/);
    const missing = await maya.html("/married/missing");
    assert.match(missing.text, /missing-married-heading/);
    assert.match(missing.text, /Cousin Ned|June Whitaker/);
    const home = await maya.html("/");
    assert.match(home.text, /dashboard-heading/);
    assert.match(home.text, /home-married-years/);
  });

  await t.test("a relative pins a margin note to a line of a letter", async () => {
    const saved = await maya.json<{ line: string }>(`/api/letters/${ids.letter}/margins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line: 8, body: "Mother still told it this way." }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /Line 8/);
    const page = await maya.html(`/letters/${ids.letter}/margins`);
    assert.match(page.text, /margins-heading/);
    assert.match(page.text, /Mother still told it this way/);
    const letter = await maya.html(`/letters/${ids.letter}`);
    assert.match(letter.text, /margins-link/);
    const index = await maya.html("/letters/margins");
    assert.match(index.text, /letter-margins-heading/);
    const missing = await maya.html("/letters/margins/missing");
    assert.match(missing.text, /missing-margins-heading/);
    assert.match(missing.text, /A note from the prairie/);
  });

  await t.test("will witnesses stand beside the will, not the event witness list", async () => {
    const saved = await maya.json<{ line: string }>("/api/wills/witnesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: ids.will, personId: ids.june, stoodOn: "2007-11-02" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /June Whitaker/);
    const page = await maya.html("/wills/witnesses");
    assert.match(page.text, /will-witnesses-heading/);
    assert.match(page.text, /June Whitaker/);
    const wills = await maya.html("/wills");
    assert.match(wills.text, /wills-heading/);
    const witnesses = await maya.html("/witnesses");
    assert.match(witnesses.text, /witnesses-heading|Witness/);
    const missing = await maya.html("/wills/witnesses/missing");
    assert.match(missing.text, /missing-will-witnesses-heading/);
    assert.match(missing.text, /without a witness/);
  });

  await t.test("who named the child is recorded beside the birth name", async () => {
    const saved = await maya.json("/api/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, kind: "birth", name: "June", namedById: ids.rose }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    const page = await maya.html("/names/given");
    assert.match(page.text, /named-by-heading/);
    assert.match(page.text, /named by Rose Whitaker/);
    const names = await maya.html("/names");
    assert.match(names.text, /both-names-heading/);
    const nicknames = await maya.html("/nicknames");
    assert.match(nicknames.text, /nicknames-heading/);
    const missing = await maya.html("/names/given/missing");
    assert.match(missing.text, /missing-named-by-heading/);
  });

  await t.test("the family crest and phrasebook stay off the motto page heading", async () => {
    const crest = await maya.json<{ line: string }>("/api/crests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker arms",
        blazon: "Argent, a cottonwood proper",
        tincture: "Argent and vert",
      }),
    });
    assert.equal(crest.status, 200, crest.body.error);
    const phrase = await maya.json<{ line: string }>("/api/phrases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrase: "He called me Whitaker", meaning: "A compliment" }),
    });
    assert.equal(phrase.status, 200, phrase.body.error);
    const crests = await maya.html("/crests");
    assert.match(crests.text, /crests-heading/);
    assert.match(crests.text, /cottonwood/);
    const phrases = await maya.html("/phrases");
    assert.match(phrases.text, /phrases-heading/);
    assert.match(phrases.text, /He called me Whitaker/);
    const mottos = await maya.html("/mottos");
    assert.match(mottos.text, /mottos-heading/);
    const missingCrest = await maya.html("/crests/missing");
    assert.match(missingCrest.text, /missing-crests-heading/);
    const missingPhrase = await maya.html("/phrases/missing");
    assert.match(missingPhrase.text, /missing-phrases-heading/);
  });

  await t.test("who holds the original and which mill made the paper stay off digitize and postage headings", async () => {
    const holder = await maya.json<{ line: string }>("/api/originals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: ids.letter, personId: ids.june }),
    });
    assert.equal(holder.status, 200, holder.body.error);
    assert.match(holder.body.line, /June Whitaker/);
    const paper = await maya.json<{ line: string }>(`/api/letters/${ids.letter}/paper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperMill: "Crane & Co., Dalton" }),
    });
    assert.equal(paper.status, 200, paper.body.error);
    const originals = await maya.html("/originals");
    assert.match(originals.text, /originals-heading/);
    const digitize = await maya.html("/digitize");
    assert.match(digitize.text, /digitize-heading/);
    const paperPage = await maya.html("/letters/paper");
    assert.match(paperPage.text, /paper-heading/);
    assert.match(paperPage.text, /Crane/);
    const letter = await maya.html(`/letters/${ids.letter}`);
    assert.match(letter.text, /Paper mill · Crane/);
    const postage = await maya.html("/letters/postage");
    assert.match(postage.text, /postage-heading/);
    const missingOriginals = await maya.html("/originals/missing");
    assert.match(missingOriginals.text, /missing-originals-heading/);
    const missingPaper = await maya.html("/letters/paper/missing");
    assert.match(missingPaper.text, /missing-paper-heading/);
    assert.match(missingPaper.text, /A note from the prairie/);
  });

  await t.test("a reunion program and a portrait sitter are entered like a relative would", async () => {
    const welcome = await maya.json<{ line: string }>(`/api/reunions/${ids.reunion}/program`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Welcome", startsAt: "morning", personId: ids.june }),
    });
    assert.equal(welcome.status, 200, welcome.body.error);
    await maya.json(`/api/reunions/${ids.reunion}/program`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Grace", startsAt: "noon", personId: ids.blank }),
    });
    const sitter = await maya.json<{ line: string }>("/api/sitters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.rosePhoto, personId: ids.rose }),
    });
    assert.equal(sitter.status, 200, sitter.body.error);
    const program = await maya.html(`/reunions/${ids.reunion}/program`);
    assert.match(program.text, /program-heading/);
    assert.match(program.text, /Welcome/);
    const reunion = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(reunion.text, /reunion-title/);
    assert.match(reunion.text, /program-link/);
    const programs = await maya.html("/programs");
    assert.match(programs.text, /programs-heading/);
    const missingProgram = await maya.html("/reunions/programs/missing");
    assert.match(missingProgram.text, /missing-programs-heading/);
    assert.match(missingProgram.text, /quiet picnic/);
    const sitters = await maya.html("/sitters");
    assert.match(sitters.text, /sitters-heading/);
    assert.match(sitters.text, /Rose Whitaker/);
    const missingSitters = await maya.html("/sitters/missing");
    assert.match(missingSitters.text, /missing-sitters-heading/);
  });

  await t.test("middle names use the person form and stay off the missing-births heading", async () => {
    const saved = await maya.json("/api/people/" + ids.june, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ middleName: "Ruth" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    const page = await maya.html("/middles");
    assert.match(page.text, /middles-heading/);
    assert.match(page.text, /Rose Mae Whitaker|June Ruth Whitaker/);
    const person = await maya.html(`/people/${ids.rose}`);
    assert.match(person.text, /middle-name/);
    const births = await maya.html("/births/missing");
    assert.match(births.text, /missing-births-heading/);
    const missing = await maya.html("/middles/missing");
    assert.match(missing.text, /missing-middles-heading/);
    assert.match(missing.text, /Cousin Ned|Louis Whitaker/);
  });

  await t.test("viewers can read the new pages and quiet start-here stay the same", async () => {
    const married = await viewer.html("/married");
    assert.match(married.text, /Rose Whitaker/);
    const margins = await viewer.html(`/letters/${ids.letter}/margins`);
    assert.match(margins.text, /Mother still told it this way/);
    const denied = await viewer.json("/api/crests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Should fail", blazon: "Azure" }),
    });
    assert.equal(denied.status, 403);
    const start = await maya.json<{ steps: { id: string }[] }>("/api/start");
    assert.equal(start.body.steps.length, 3);
    const quiet = await maya.html("/quiet");
    assert.match(quiet.text, /quiet/);
    const notices = await maya.json<{ notifications: { title?: string; body?: string }[] }>("/api/notifications");
    const blob = JSON.stringify(notices.body.notifications);
    assert.doesNotMatch(blob, /Mother still told it this way|margin note/);
  });
});
