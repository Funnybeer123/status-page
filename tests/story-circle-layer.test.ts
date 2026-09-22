import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can gather a story circle, fold a letter, and print how they are related", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("story-circle-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker story-circle",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("story-circle-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a will, a prompt, a reunion, and a motto entered the way a relative would", async () => {
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
    await maya.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPersonId: ids.rose, toPersonId: ids.june, type: "parent" }),
    });
    const first = new FormData();
    first.set("title", "Harvest letter");
    first.set("writtenAt", "1947-10-18");
    first.set("transcript", "I danced three times with Samuel Hart from the north farm.");
    first.set("translation", "Bailé tres veces con Samuel Hart de la granja del norte.");
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
        body: "The navy hatband goes to June. The north farm stays with the children.",
        writtenAt: "2007-11-02",
        personIds: [ids.rose],
      }),
    });
    assert.equal(will.status, 200, will.body.error);
    ids.will = will.body.will.id;
    const probate = await maya.json<{ record: { id: string } }>("/api/later-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "probate",
        personId: ids.rose,
        title: "Rose Whitaker’s estate",
        happenedOn: "2008-12-01",
        place: "Cedar Falls",
      }),
    });
    assert.equal(probate.status, 200, probate.body.error);
    ids.probate = probate.body.record.id;
    const prompt = await maya.json<{ prompt: { id: string } }>("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "How did the grandparents meet?", body: "Tell it the way you heard it." }),
    });
    assert.equal(prompt.status, 200, prompt.body.error);
    ids.prompt = prompt.body.prompt.id;
    const lonely = await maya.json<{ prompt: { id: string } }>("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Who still makes the Sunday rolls?" }),
    });
    ids.lonely = lonely.body.prompt.id;
    const junePhoto = new FormData();
    junePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "june.svg");
    junePhoto.set("title", "June on Market Street");
    junePhoto.set("capturedAt", "1984-06-15T14:00:00Z");
    junePhoto.set("personIds", ids.june);
    const savedJune = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: junePhoto });
    ids.junePhoto = savedJune.body.asset.id;
    const rosePhoto = new FormData();
    rosePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
    rosePhoto.set("title", "Rose at the Grange hall");
    rosePhoto.set("capturedAt", "1947-10-18T20:00:00Z");
    rosePhoto.set("personIds", ids.rose);
    const savedRose = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: rosePhoto });
    ids.rosePhoto = savedRose.body.asset.id;
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
        title: "A quiet picnic without shifts",
        place: "North farm",
        happenedOn: "2026-07-04",
        personIds: [ids.june],
      }),
    });
    const motto = await maya.json<{ record: { id: string } }>("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "motto", text: "Courtesy to the trees", notes: "Said of the cottonwoods." }),
    });
    assert.equal(motto.status, 200, motto.body.error);
    await maya.json("/api/mottos/prefer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mottoId: motto.body.record.id }),
    });
  });

  await t.test("two relatives answer the same prompt and it becomes a story circle", async () => {
    const first = await maya.json("/api/prompts/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promptId: ids.prompt,
        personId: ids.june,
        body: "June said the cider was too sweet and they walked home past the cottonwoods.",
      }),
    });
    assert.equal(first.status, 200, first.body.error);
    const second = await maya.json("/api/prompts/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promptId: ids.prompt,
        personId: ids.rose,
        body: "Rose wrote that Samuel asked after the third dance.",
      }),
    });
    assert.equal(second.status, 200, second.body.error);
    await maya.json("/api/prompts/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promptId: ids.lonely,
        personId: ids.june,
        body: "The navy-blue bowl is still in the upstairs hall.",
      }),
    });
    const page = await maya.html("/circles");
    assert.match(page.text, /story-circles-heading/);
    assert.match(page.text, /How did the grandparents meet/);
    const one = await maya.html(`/circles/${ids.prompt}`);
    assert.match(one.text, /story-circle-heading/);
    assert.match(one.text, /June Whitaker|June said/);
    assert.match(one.text, /Rose/);
    const prompts = await maya.html("/prompts");
    assert.match(prompts.text, /prompts-heading/);
    const missing = await maya.html("/circles/missing");
    assert.match(missing.text, /missing-circles-heading/);
    assert.match(missing.text, /Sunday rolls/);
    const lonely = await maya.html("/circles/one");
    assert.match(lonely.text, /one-voice-heading/);
  });

  await t.test("a letter keeps a folding diagram next to the postage", async () => {
    const saved = await maya.json<{ line: string }>(`/api/letters/${ids.letter}/fold`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foldPattern: "in thirds" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.equal(saved.body.line, "Folded in thirds");
    const letter = await maya.html(`/letters/${ids.letter}`);
    assert.match(letter.text, /Folded in thirds/);
    assert.match(letter.text, /fold-link/);
    const fold = await maya.html(`/letters/${ids.letter}/fold`);
    assert.match(fold.text, /fold-diagram-heading/);
    assert.match(fold.text, /Fold the bottom third/);
    const folds = await maya.html("/letters/folds");
    assert.match(folds.text, /folds-heading/);
    assert.match(folds.text, /Harvest letter/);
    const missing = await maya.html("/letters/folds/missing");
    assert.match(missing.text, /missing-folds-heading/);
    assert.match(missing.text, /A note from the prairie/);
  });

  await t.test("who inherited what is tied to the will and probate", async () => {
    const hat = await maya.json<{ line: string }>("/api/inheritances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.june,
        title: "Navy hatband",
        documentId: ids.will,
        probateId: ids.probate || undefined,
      }),
    });
    assert.equal(hat.status, 200, hat.body.error);
    assert.match(hat.body.line, /Navy hatband/);
    await maya.json("/api/inheritances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.blank,
        title: "North farm",
        documentId: ids.will,
        probateId: ids.probate || undefined,
      }),
    });
    const page = await maya.html("/inheritances");
    assert.match(page.text, /inheritances-heading/);
    assert.match(page.text, /Navy hatband/);
    assert.match(page.text, /June Whitaker/);
    const wills = await maya.html("/wills");
    assert.match(wills.text, /wills-heading/);
    const probate = await maya.html("/probate");
    assert.match(probate.text, /probate-heading/);
    const receipt = await maya.html("/inheritances/receipt");
    assert.match(receipt.text, /inheritance-receipt-heading/);
    const missing = await maya.html("/inheritances/missing");
    assert.match(missing.text, /missing-inheritances-heading/);
  });

  await t.test("a reunion table tent prints the family motto", async () => {
    const tent = await maya.html(`/reunions/${ids.reunion}/tent`);
    assert.match(tent.text, /table-tent-heading/);
    assert.match(tent.text, /Courtesy to the trees/);
    const reunion = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(reunion.text, /reunion-title/);
    assert.match(reunion.text, /table-tent-link/);
    const mottos = await maya.html("/mottos");
    assert.match(mottos.text, /mottos-heading/);
    const tents = await maya.html("/tents");
    assert.match(tents.text, /tents-heading/);
    const missing = await maya.html("/tents/missing");
    assert.match(missing.text, /missing-tents-heading/);
  });

  await t.test("the activity heatmap groups this month’s additions", async () => {
    const page = await maya.html("/activity/heatmap");
    assert.match(page.text, /heatmap-heading/);
    assert.match(page.text, /heatmap-cell|2026-09|Archive activity/);
    const api = await maya.json<{ months: { month: string; count: number }[] }>("/api/activity/heatmap");
    assert.ok(api.body.months.length);
    const hottest = await maya.html("/activity/heatmap/hottest");
    assert.match(hottest.text, /hottest-month-heading/);
    const empty = await maya.html("/activity/heatmap/empty");
    assert.match(empty.text, /empty-heatmap-heading/);
    const activity = await maya.html("/activity");
    assert.match(activity.text, /activity-heading/);
  });

  await t.test("a favorite photograph surfaces on the person page", async () => {
    const saved = await maya.json<{ heading: string }>("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, assetId: ids.rosePhoto }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    const page = await maya.html(`/people/${ids.rose}`);
    assert.match(page.text, /favorite-photo/);
    assert.match(page.text, /Rose at the Grange hall/);
    const favorites = await maya.html("/favorites");
    assert.match(favorites.text, /favorites-heading/);
    assert.match(favorites.text, /Rose Whitaker/);
    const missing = await maya.html("/favorites/missing");
    assert.match(missing.text, /missing-favorites-heading/);
    assert.match(missing.text, /June Whitaker/);
  });

  await t.test("bilingual Ask prefers the translation and default Ask stays English", async () => {
    const usual = await maya.json<{ answer: string; sources: { excerpt: string }[] }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What did Rose write about the north farm?" }),
    });
    assert.equal(usual.status, 200, usual.body.error);
    const bilingual = await maya.json<{ sources: { excerpt: string }[] }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What did Rose write about the north farm?", bilingual: true }),
    });
    assert.equal(bilingual.status, 200, bilingual.body.error);
    const blob = JSON.stringify(bilingual.body.sources);
    assert.match(blob, /granja del norte|Bailé/);
    const pref = await maya.json<{ bilingual: boolean }>("/api/ask/bilingual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bilingual: true }),
    });
    assert.equal(pref.body.bilingual, true);
    const page = await maya.html("/ask/bilingual");
    assert.match(page.text, /bilingual-ask-heading/);
    const ask = await maya.html("/ask");
    assert.match(ask.text, /ask-heading/);
    const missing = await maya.html("/ask/bilingual/missing");
    assert.match(missing.text, /missing-translations-heading/);
  });

  await t.test("the archive anniversary counts years since the first upload", async () => {
    const page = await maya.html("/anniversary");
    assert.match(page.text, /anniversary-heading/);
    assert.match(page.text, /first year|year since/);
    const home = await maya.html("/");
    assert.match(home.text, /dashboard-heading/);
    assert.match(home.text, /home-anniversary/);
    const empty = await maya.html("/anniversary/empty");
    assert.match(empty.text, /empty-anniversary-heading/);
    const start = await maya.html("/start");
    assert.match(start.text, /start-heading/);
  });

  await t.test("a relative signs up for a digitizing shift at the reunion", async () => {
    const saved = await maya.json<{ line: string }>(`/api/reunions/${ids.reunion}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, label: "Morning scanner", startsAt: "morning" }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /June Whitaker/);
    await maya.json(`/api/reunions/${ids.reunion}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.blank, label: "Afternoon indexer", startsAt: "afternoon" }),
    });
    const page = await maya.html(`/reunions/${ids.reunion}/shifts`);
    assert.match(page.text, /shifts-heading/);
    assert.match(page.text, /Morning scanner/);
    const reunion = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(reunion.text, /shifts-link/);
    const digitize = await maya.html("/digitize");
    assert.match(digitize.text, /digitize-heading/);
    const roster = await maya.html(`/reunions/${ids.reunion}/roster`);
    assert.match(roster.text, /shift-roster-heading/);
    const missing = await maya.html("/reunions/shifts/missing");
    assert.match(missing.text, /missing-shifts-heading/);
    assert.match(missing.text, /quiet picnic/);
  });

  await t.test("a one-page related card prints how two people connect", async () => {
    const card = await maya.html(`/related/card?from=${ids.june}&to=${ids.rose}`);
    assert.match(card.text, /related-card-heading/);
    assert.match(card.text, /related-card-line|child|parent/);
    const related = await maya.html(`/related?from=${ids.june}&to=${ids.rose}`);
    assert.match(related.text, /related-heading/);
    const missing = await maya.html("/related/card/missing");
    assert.match(missing.text, /missing-related-card-heading/);
    const same = await maya.html(`/related/card?from=${ids.june}&to=${ids.june}`);
    assert.match(same.text, /same person|June Whitaker/);
  });

  await t.test("viewers can read the new pages and quiet start-here stay the same", async () => {
    const circle = await viewer.html("/circles");
    assert.match(circle.text, /How did the grandparents meet/);
    const tent = await viewer.html(`/reunions/${ids.reunion}/tent`);
    assert.match(tent.text, /Courtesy to the trees/);
    const inherit = await viewer.html("/inheritances");
    assert.match(inherit.text, /Navy hatband/);
    const denied = await viewer.json("/api/inheritances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.june, title: "Should fail" }),
    });
    assert.equal(denied.status, 403);
    const start = await maya.json<{ steps: { id: string }[] }>("/api/start");
    assert.equal(start.body.steps.length, 3);
    const quiet = await maya.html("/quiet");
    assert.match(quiet.text, /quiet/);
    const notices = await maya.json<{ notifications: { title?: string; body?: string }[] }>("/api/notifications");
    const blob = JSON.stringify(notices.body.notifications);
    assert.doesNotMatch(blob, /askPreferTranslation|Prefer the translation/);
  });
});
