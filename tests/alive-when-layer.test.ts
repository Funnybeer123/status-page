import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can slide a year, print a recipe card, and check guests in", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("alive-when-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker alive-when",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("alive-when-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, places, letters, recipes, and a reunion entered the way a relative would", async () => {
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
    const cedar = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" }),
    });
    ids.cedar = cedar.body.place.id;
    const farm = await maya.json<{ place: { id: string } }>("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "North farm", locality: "Cedar Falls", region: "Iowa" }),
    });
    ids.farm = farm.body.place.id;
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        placeId: ids.cedar,
        startedAt: "1929-03-08",
        endedAt: "1948-06-14",
      }),
    });
    await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        placeId: ids.farm,
        startedAt: "1948-06-14",
        endedAt: "2008-11-02",
      }),
    });
    const first = new FormData();
    first.set("title", "Harvest letter");
    first.set("writtenAt", "1947-10-18");
    first.set("transcript", "I danced three times with Samuel Hart from the north farm.");
    first.set("personIds", ids.rose);
    const savedFirst = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
    ids.letter = savedFirst.body.document.id;
    const reply = new FormData();
    reply.set("title", "Ruth to Rose, after the dance");
    reply.set("writtenAt", "1947-10-22");
    reply.set("transcript", "The stamp is hard to read, but I still have the program.");
    reply.set("personIds", ids.rose);
    reply.set("replyToId", ids.letter);
    const savedReply = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: reply });
    ids.reply = savedReply.body.document.id;
    const mystery = new FormData();
    mystery.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "program.svg");
    mystery.set("title", "Harvest program still in the box");
    mystery.set("capturedAt", "1947-10-18T20:00:00Z");
    const savedMystery = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: mystery });
    ids.program = savedMystery.body.asset.id;
    const holiday = await maya.json<{ record: { id: string } }>("/api/later-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "holiday", title: "Harvest-dance anniversary supper", season: "October" }),
    });
    ids.holiday = holiday.body.record.id;
    const rolls = await maya.json<{ recipe: { id: string } }>("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Sunday rolls",
        body: "Warm milk, a cake of yeast, and the navy-blue bowl.",
        personIds: [ids.rose],
        holidayId: ids.holiday,
      }),
    });
    ids.rolls = rolls.body.recipe.id;
    const soup = await maya.json<{ recipe: { id: string } }>("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Weeknight soup",
        body: "Whatever was left after the harvest.",
      }),
    });
    ids.soup = soup.body.recipe.id;
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker reunion at the Grange",
        place: "Grange hall",
        happenedOn: "2026-09-22",
        personIds: [ids.june, ids.blank],
      }),
    });
    ids.reunion = reunion.body.reunion.id;
    const emptyReunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "A quiet picnic without a list",
        place: "North farm",
        happenedOn: "2026-10-18",
        personIds: [ids.june],
      }),
    });
    ids.emptyReunion = emptyReunion.body.reunion.id;
    const story = await maya.json<{ story: { id: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Cottonwoods this summer",
        body: "Lily said the cottonwoods still hold the walk home.",
        personIds: [ids.june],
      }),
    });
    ids.story = story.body.story.id;
  });

  await t.test("the year slider highlights people who were alive then", async () => {
    const page = await maya.html("/tree/when?year=1947");
    assert.match(page.text, /alive-when-heading/);
    assert.match(page.text, /Who was alive in 1947/);
    assert.match(page.text, /tree-alive/);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Louis Whitaker/);
    const missing = await maya.html("/tree/when/missing");
    assert.match(missing.text, /missing-alive-year-heading/);
    assert.match(missing.text, /Cousin Ned/);
    const died = await maya.html("/tree/when/died?year=2008");
    assert.match(died.text, /died-year-heading/);
    assert.match(died.text, /Rose Whitaker/);
    const born = await maya.html("/tree/when/born?year=1929");
    assert.match(born.text, /born-year-heading/);
    assert.match(born.text, /Rose Whitaker/);
    const tree = await maya.html("/tree");
    assert.match(tree.text, /tree-heading/);
    assert.match(tree.text, /alive-when-link/);
    const living = await maya.html("/tree/living");
    assert.match(living.text, /living-tree-heading/);
  });

  await t.test("a recipe card print sheet names the cook and the holiday", async () => {
    const card = await maya.html(`/recipes/${ids.rolls}/card`);
    assert.match(card.text, /recipe-card-heading/);
    assert.match(card.text, /Cooked by Rose Whitaker/);
    assert.match(card.text, /For Harvest-dance anniversary supper/);
    const cookbook = await maya.html("/recipes");
    assert.match(cookbook.text, /recipes-heading/);
    const holidays = await maya.html("/recipes/holidays");
    assert.match(holidays.text, /holiday-cookbook-heading/);
    const cards = await maya.html("/recipes/cards");
    assert.match(cards.text, /recipe-cards-heading/);
    const missing = await maya.html("/recipes/cards/missing");
    assert.match(missing.text, /missing-cook-heading/);
    assert.match(missing.text, /Weeknight soup/);
  });

  await t.test("the photo mystery queue takes a guess from a relative", async () => {
    const guess = await maya.json<{ line: string }>("/api/mystery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.program, personId: ids.rose, note: "The hatband from the Grange hall." }),
    });
    assert.equal(guess.status, 200, guess.body.error);
    assert.match(guess.body.line, /Rose Whitaker/);
    const page = await maya.html("/mystery");
    assert.match(page.text, /mystery-heading/);
    assert.match(page.text, /Harvest program still in the box/);
    assert.match(page.text, /Rose Whitaker/);
    const unidentified = await maya.html("/unidentified");
    assert.match(unidentified.text, /unidentified-heading/);
    const empty = await maya.html("/mystery/empty");
    assert.match(empty.text, /empty-mystery-heading/);
    const unnamed = await maya.html("/mystery/unnamed");
    assert.match(unnamed.text, /unnamed-guess-heading/);
  });

  await t.test("a shared shopping list holds plates, chairs, and name tags", async () => {
    for (const item of [
      { label: "Plates", quantity: 48 },
      { label: "Chairs", quantity: 40 },
      { label: "Name tags", quantity: 60 },
    ]) {
      const saved = await maya.json<{ line: string }>("/api/reunions/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reunionId: ids.reunion, ...item }),
      });
      assert.equal(saved.status, 200, saved.body.error);
    }
    const page = await maya.html(`/reunions/${ids.reunion}/shop`);
    assert.match(page.text, /shop-heading/);
    assert.match(page.text, /Plates · 48/);
    assert.match(page.text, /Chairs · 40/);
    assert.match(page.text, /Name tags · 60/);
    const reunion = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(reunion.text, /reunion-title/);
    assert.match(reunion.text, /shop-link/);
    const missing = await maya.html("/reunions/shop/missing");
    assert.match(missing.text, /missing-shop-heading/);
    assert.match(missing.text, /A quiet picnic without a list/);
  });

  await t.test("first and last letter markers sit on the reading room thread", async () => {
    const room = await maya.html(`/letters/${ids.reply}/room`);
    assert.match(room.text, /reading-room-heading/);
    assert.match(room.text, /first-letter/);
    assert.match(room.text, /last-letter/);
    assert.match(room.text, /Harvest letter/);
    assert.match(room.text, /Ruth to Rose/);
    const correspondence = await maya.html("/correspondence");
    assert.match(correspondence.text, /correspondence-heading/);
    const singles = await maya.html("/correspondence/single");
    assert.match(singles.text, /single-thread-heading/);
  });

  await t.test("a printable bookmark holds a life span and key places", async () => {
    const page = await maya.html(`/people/${ids.rose}/bookmark`);
    assert.match(page.text, /life-bookmark-heading/);
    assert.match(page.text, /1929/);
    assert.match(page.text, /Cedar Falls/);
    assert.match(page.text, /North farm/);
    const bookmarks = await maya.html("/bookmarks");
    assert.match(bookmarks.text, /bookmarks-heading/);
    const lives = await maya.html("/bookmarks/lives");
    assert.match(lives.text, /life-bookmarks-heading/);
    const missing = await maya.html("/bookmarks/places/missing");
    assert.match(missing.text, /missing-bookmark-places-heading/);
    assert.match(missing.text, /Cousin Ned/);
  });

  await t.test("the family dictionary of places remembers how they named a farm", async () => {
    const saved = await maya.json<{ line: string }>("/api/places/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: ids.farm, name: "Sam’s place", notes: "How Rose still said the north farm." }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.match(saved.body.line, /Sam’s place/);
    const page = await maya.html("/places/names");
    assert.match(page.text, /place-names-heading/);
    assert.match(page.text, /Sam’s place/);
    const dictionary = await maya.html("/dictionary");
    assert.match(dictionary.text, /dictionary-heading/);
    const missing = await maya.html("/places/names/missing");
    assert.match(missing.text, /missing-place-name-heading/);
    assert.match(missing.text, /Cedar Falls/);
  });

  await t.test("the trash audit records who put what aside", async () => {
    const extra = new FormData();
    extra.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "spare.svg");
    extra.set("title", "A spare picnic print");
    const saved = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: extra });
    const trashed = await maya.json("/api/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "photo", id: saved.body.asset.id }),
    });
    assert.equal(trashed.status, 200, trashed.body.error);
    const audit = await maya.html("/trash/audit");
    assert.match(audit.text, /trash-audit-heading/);
    assert.match(audit.text, /Maya Park put in the trash A spare picnic print/);
    const trash = await maya.html("/trash");
    assert.match(trash.text, /trash-heading/);
    const empty = await maya.html("/trash/audit/empty");
    assert.match(empty.text, /empty-audit-heading/);
  });

  await t.test("the read-later shelf keeps a letter and a story without notifying anyone", async () => {
    const letter = await maya.json<{ line: string }>("/api/later", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: ids.letter }),
    });
    assert.equal(letter.status, 200, letter.body.error);
    const story = await maya.json<{ line: string }>("/api/later", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId: ids.story }),
    });
    assert.equal(story.status, 200, story.body.error);
    const page = await maya.html("/later");
    assert.match(page.text, /read-later-heading/);
    assert.match(page.text, /Harvest letter/);
    assert.match(page.text, /Cottonwoods this summer/);
    const empty = await maya.html("/later/empty");
    assert.match(empty.text, /empty-shelf-heading/);
    const notices = await maya.json<{ notifications?: { title?: string }[] }>("/api/notifications");
    assert.ok(!(notices.body.notifications || []).some((row) => /read later|Read later/i.test(row.title || "")));
    const viewerShelf = await viewer.html("/later");
    assert.doesNotMatch(viewerShelf.text, /Harvest letter/);
  });

  await t.test("the reunion check-in kiosk marks a guest as arrived", async () => {
    const arrived = await maya.json<{ line: string }>("/api/reunions/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reunionId: ids.reunion, personId: ids.june, arrived: true }),
    });
    assert.equal(arrived.status, 200, arrived.body.error);
    assert.match(arrived.body.line, /June Whitaker arrived/);
    const page = await maya.html(`/reunions/${ids.reunion}/checkin`);
    assert.match(page.text, /checkin-heading/);
    assert.match(page.text, /June Whitaker arrived/);
    const kiosk = await maya.html(`/reunions/${ids.reunion}/kiosk`);
    assert.match(kiosk.text, /kiosk-title/);
    assert.match(kiosk.text, /kiosk-coming/);
    assert.match(kiosk.text, /kiosk-arrived/);
    assert.match(kiosk.text, /June Whitaker/);
    const reunion = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(reunion.text, /reunion-title/);
    assert.match(reunion.text, /checkin-link/);
    const missing = await maya.html("/reunions/checkin/missing");
    assert.match(missing.text, /missing-checkin-heading/);
    assert.match(missing.text, /Cousin Ned/);
  });

  await t.test("viewers can read the new pages and quiet start-here stay the same", async () => {
    const year = await viewer.html("/tree/when?year=1947");
    assert.match(year.text, /alive-when-heading/);
    const card = await viewer.html(`/recipes/${ids.rolls}/card`);
    assert.match(card.text, /Cooked by Rose Whitaker/);
    const mystery = await viewer.html("/mystery");
    assert.match(mystery.text, /mystery-heading/);
    const start = await maya.json<{ steps: { id: string }[] }>("/api/start");
    assert.equal(start.body.steps.length, 3);
    const startPage = await maya.html("/start");
    assert.match(startPage.text, /start-heading/);
    const quiet = await maya.html("/quiet");
    assert.match(quiet.text, /quiet/);
  });
});
