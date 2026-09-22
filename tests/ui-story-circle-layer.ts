import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-story-circle");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker story-circle" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
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
  await client.json("/api/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june }),
  });
  await client.json("/api/relationships", {
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
  const savedFirst = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
  ids.letter = savedFirst.body.document.id;
  await client.json(`/api/letters/${ids.letter}/fold`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ foldPattern: "in thirds" }),
  });
  const prairie = new FormData();
  prairie.set("title", "A note from the prairie");
  prairie.set("writtenAt", "1947-10-20");
  prairie.set("transcript", "The stamp is from a town I cannot place.");
  await client.json("/api/letters", { method: "POST", body: prairie });
  const will = await client.json<{ will: { id: string } }>("/api/wills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Rose Whitaker’s will",
      body: "The navy hatband goes to June. The north farm stays with the children.",
      writtenAt: "2007-11-02",
      personIds: [ids.rose],
    }),
  });
  ids.will = will.body.will.id;
  const probate = await client.json<{ record: { id: string } }>("/api/later-records", {
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
  await client.json("/api/inheritances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.june,
      title: "Navy hatband",
      documentId: ids.will,
      probateId: probate.body.record.id,
    }),
  });
  const prompt = await client.json<{ prompt: { id: string } }>("/api/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "How did the grandparents meet?", body: "Tell it the way you heard it." }),
  });
  ids.prompt = prompt.body.prompt.id;
  await client.json("/api/prompts/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      promptId: ids.prompt,
      personId: ids.june,
      body: "June said the cider was too sweet and they walked home past the cottonwoods.",
    }),
  });
  await client.json("/api/prompts/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      promptId: ids.prompt,
      personId: ids.rose,
      body: "Rose wrote that Samuel asked after the third dance.",
    }),
  });
  const rosePhoto = new FormData();
  rosePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
  rosePhoto.set("title", "Rose at the Grange hall");
  rosePhoto.set("capturedAt", "1947-10-18T20:00:00Z");
  rosePhoto.set("personIds", ids.rose);
  const savedRose = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: rosePhoto });
  await client.json("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, assetId: savedRose.body.asset.id }),
  });
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
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
  await client.json(`/api/reunions/${ids.reunion}/shifts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june, label: "Morning scanner", startsAt: "morning" }),
  });
  const motto = await client.json<{ record: { id: string } }>("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "motto", text: "Courtesy to the trees" }),
  });
  await client.json("/api/mottos/prefer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mottoId: motto.body.record.id }),
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

  await page.goto(`${BASE}/circles/${ids.prompt}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=story-circle-answers]");
  await shot("story_circle.png");

  await page.goto(`${BASE}/letters/${ids.letter}/fold`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=fold-diagram]");
  await shot("letter_fold.png");

  await page.goto(`${BASE}/inheritances`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=inheritances-table]");
  await shot("who_inherited.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/tent`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=table-tent]");
  await shot("table_tent.png");

  await page.goto(`${BASE}/activity/heatmap`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=heatmap]");
  await shot("activity_heatmap.png");

  await page.goto(`${BASE}/people/${ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=favorite-photo]");
  await shot("favorite_photo.png");

  await page.goto(`${BASE}/ask/bilingual`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=bilingual-ask]");
  await shot("bilingual_ask.png");

  await page.goto(`${BASE}/anniversary`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=anniversary-line]");
  await shot("archive_anniversary.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/shifts`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=shifts-list]");
  await shot("digitize_shifts.png");

  await page.goto(`${BASE}/related/card?from=${ids.june}&to=${ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=related-card]");
  await shot("related_card.png");

  await page.goto(`${BASE}/circles/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-circles-heading]");
  await shot("story_circle_missing.png");

  await page.goto(`${BASE}/letters/folds/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-folds-list]");
  await shot("letter_fold_missing.png");

  await page.goto(`${BASE}/tents/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-tents-heading]");
  await shot("table_tent_missing.png");

  await page.goto(`${BASE}/favorites/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-favorites-list]");
  await shot("favorite_photo_missing.png");

  await page.goto(`${BASE}/anniversary/empty`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=empty-anniversary-heading]");
  await shot("archive_anniversary_empty.png");

  await browser.close();
  writeFileSync(`${MEDIA}/story_circle_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui story-circle layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
