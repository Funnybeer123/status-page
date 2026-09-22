import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-alive-when");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker alive-when" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
    { key: "blank", displayName: "Cousin Ned", givenName: "Ned", familyName: "Whitaker" },
  ]) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  const cedar = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" }),
  });
  ids.cedar = cedar.body.place.id;
  const farm = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "North farm", locality: "Cedar Falls", region: "Iowa" }),
  });
  ids.farm = farm.body.place.id;
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, placeId: ids.cedar, startedAt: "1929-03-08", endedAt: "1948-06-14" }),
  });
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, placeId: ids.farm, startedAt: "1948-06-14", endedAt: "2008-11-02" }),
  });
  const first = new FormData();
  first.set("title", "Harvest letter");
  first.set("writtenAt", "1947-10-18");
  first.set("transcript", "I danced three times with Samuel Hart from the north farm.");
  first.set("personIds", ids.rose);
  const savedFirst = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
  ids.letter = savedFirst.body.document.id;
  const reply = new FormData();
  reply.set("title", "Ruth to Rose, after the dance");
  reply.set("writtenAt", "1947-10-22");
  reply.set("transcript", "The stamp is hard to read, but I still have the program.");
  reply.set("personIds", ids.rose);
  reply.set("replyToId", ids.letter);
  const savedReply = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: reply });
  ids.reply = savedReply.body.document.id;
  const mystery = new FormData();
  mystery.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "program.svg");
  mystery.set("title", "Harvest program still in the box");
  mystery.set("capturedAt", "1947-10-18T20:00:00Z");
  const savedMystery = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: mystery });
  ids.program = savedMystery.body.asset.id;
  await client.json("/api/mystery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.program, personId: ids.rose }),
  });
  const holiday = await client.json<{ record: { id: string } }>("/api/later-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "holiday", title: "Harvest-dance anniversary supper", season: "October" }),
  });
  const rolls = await client.json<{ recipe: { id: string } }>("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Sunday rolls",
      body: "Warm milk, a cake of yeast, and the navy-blue bowl.",
      personIds: [ids.rose],
      holidayId: holiday.body.record.id,
    }),
  });
  ids.rolls = rolls.body.recipe.id;
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
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
  for (const item of [
    { label: "Plates", quantity: 48 },
    { label: "Chairs", quantity: 40 },
    { label: "Name tags", quantity: 60 },
  ]) {
    await client.json("/api/reunions/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reunionId: ids.reunion, ...item }),
    });
  }
  await client.json("/api/reunions/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reunionId: ids.reunion, personId: ids.june, arrived: true }),
  });
  await client.json("/api/places/names", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId: ids.farm, name: "Sam’s place", notes: "How Rose still said the north farm." }),
  });
  await client.json("/api/later", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: ids.letter }),
  });
  const extra = new FormData();
  extra.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "spare.svg");
  extra.set("title", "A spare picnic print");
  const savedExtra = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: extra });
  await client.json("/api/trash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "photo", id: savedExtra.body.asset.id }),
  });
  return { email, ids };
}

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const { email, ids } = await prepare();
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1280,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const written: string[] = [];
  async function shot(name: string) {
    const dest = `${MEDIA}/${name}`;
    await page.screenshot({ path: dest, fullPage: true });
    const size = statSync(dest).size;
    if (size < 10_000) throw new Error(`${name} is only ${size} bytes`);
    written.push(dest);
  }

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await page.type("input[type=email]", email);
  await page.type("input[type=password]", PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click("[data-testid=login-submit]"),
  ]);

  await page.goto(`${BASE}/tree/when?year=1947`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=alive-when-tree]");
  await shot("alive_when_slider.png");

  await page.goto(`${BASE}/recipes/${ids.rolls}/card`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=recipe-card]");
  await shot("recipe_card.png");

  await page.goto(`${BASE}/mystery`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=mystery-list]");
  await shot("photo_mystery.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/shop`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=shop-list]");
  await shot("reunion_shopping_list.png");

  await page.goto(`${BASE}/letters/${ids.reply}/room`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=first-letter]");
  await shot("first_last_letter.png");

  await page.goto(`${BASE}/people/${ids.rose}/bookmark`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=life-bookmark]");
  await shot("life_bookmark.png");

  await page.goto(`${BASE}/places/names`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=place-names-list]");
  await shot("place_dictionary.png");

  await page.goto(`${BASE}/trash/audit`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=trash-audit-list]");
  await shot("trash_audit.png");

  await page.goto(`${BASE}/later`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=read-later-list]");
  await shot("read_later_shelf.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/checkin`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=checkin-list]");
  await shot("reunion_checkin.png");

  await page.goto(`${BASE}/tree/when/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-alive-year-list]");
  await shot("alive_when_missing.png");

  await page.goto(`${BASE}/recipes/cards/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-cook-list]");
  await shot("recipe_card_missing.png");

  await page.goto(`${BASE}/mystery/empty`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=empty-mystery-heading]");
  await shot("photo_mystery_empty.png");

  await page.goto(`${BASE}/later/empty`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=empty-shelf-heading]");
  await shot("read_later_empty.png");

  await page.goto(`${BASE}/reunions/checkin/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-checkin-list]");
  await shot("reunion_checkin_missing.png");

  await browser.close();
  writeFileSync(`${MEDIA}/alive_when_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui alive-when layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
