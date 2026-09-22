import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg, makeWav } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-family-hour");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker family-hour" });
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
  const first = new FormData();
  first.set("title", "Harvest letter");
  first.set("writtenAt", "1947-10-18");
  first.set("transcript", "I danced three times with Samuel Hart from the north farm.");
  first.set("personIds", ids.rose);
  const savedFirst = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
  ids.letter = savedFirst.body.document.id;
  await client.json(`/api/letters/${ids.letter}/postmark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stampText: "Cedar Falls, Iowa", postmarkedAt: "1947-10-19" }),
  });
  await client.json(`/api/letters/${ids.letter}/postage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postage: "3 cents" }),
  });
  const prairie = new FormData();
  prairie.set("title", "A note from the prairie");
  prairie.set("writtenAt", "1947-10-20");
  prairie.set("transcript", "The stamp is from a town I cannot place.");
  const savedPrairie = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: prairie });
  await client.json(`/api/letters/${savedPrairie.body.document.id}/postmark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stampText: "Unknown prairie", postmarkedAt: "1947-10-20" }),
  });
  const bytes = makePhotoSvg();
  const picnic = new FormData();
  picnic.set("file", new Blob([bytes], { type: "image/svg+xml" }), "picnic.svg");
  picnic.set("title", "Hart picnic, 1961");
  picnic.set("capturedAt", "1961-07-04T16:00:00Z");
  picnic.set("personIds", ids.rose);
  await client.json("/api/assets", { method: "POST", body: picnic });
  const copy = new FormData();
  copy.set("file", new Blob([bytes], { type: "image/svg+xml" }), "picnic-copy.svg");
  copy.set("title", "Hart picnic, 1961 (copy)");
  copy.set("capturedAt", "1961-07-04T16:00:00Z");
  await client.json("/api/assets", { method: "POST", body: copy });
  const dance = new FormData();
  dance.set("file", new Blob([Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\"><rect width=\"20\" height=\"20\" fill=\"#5c3a2a\"/></svg>")], { type: "image/svg+xml" }), "dance.svg");
  dance.set("title", "Harvest dance, Grange hall");
  dance.set("capturedAt", "1947-10-18T20:00:00Z");
  dance.set("personIds", ids.rose);
  await client.json("/api/assets", { method: "POST", body: dance });
  const junePhoto = new FormData();
  junePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "june.svg");
  junePhoto.set("title", "June on Market Street");
  junePhoto.set("capturedAt", "1984-06-15T14:00:00Z");
  junePhoto.set("personIds", ids.june);
  await client.json("/api/assets", { method: "POST", body: junePhoto });
  const oral = new FormData();
  oral.set("file", new Blob([new Uint8Array(makeWav())], { type: "audio/wav" }), "rose.wav");
  oral.set("kind", "audio");
  oral.set("title", "Rose, said out loud");
  const savedOral = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: oral });
  await client.json("/api/oral/spoken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: savedOral.body.asset.id, personId: ids.rose }),
  });
  await client.json("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Cottonwoods this summer",
      body: "June said the cottonwoods still hold the walk home.",
      personIds: [ids.june],
    }),
  });
  await client.json("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      kind: "other",
      title: "Rose hems the harvest dress",
      happenedOn: "1947-09-22",
    }),
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
  await client.json(`/api/reunions/${ids.reunion}/seats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june, tableName: "Cottonwood", seat: 1 }),
  });
  await client.json(`/api/reunions/${ids.reunion}/seats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.blank, tableName: "Cottonwood", seat: 2 }),
  });
  await client.json("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "A quiet picnic without seats",
      place: "North farm",
      happenedOn: "2026-07-04",
      personIds: [ids.june],
    }),
  });
  await client.json("/api/hour/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june, scheduledOn: "2026-10-19", notes: "Ask about Sunday rolls." }),
  });
  await client.json("/api/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rulesText: "Viewers do not see a living birth year.\nAsk stays out of keep-out letters.",
    }),
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

  await page.goto(`${BASE}/hour`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=family-hour-countdown]");
  await shot("family_hour.png");

  await page.goto(`${BASE}/letters/postage`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=postage-list]");
  await shot("postage_cost.png");

  await page.goto(`${BASE}/photos/duplicates`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=photo-duplicates-list]");
  await shot("photo_duplicates.png");

  await page.goto(`${BASE}/oral/credits`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=oral-credits-list]");
  await shot("spoken_by.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/placecards`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=place-cards]");
  await shot("place_cards.png");

  await page.goto(`${BASE}/map/postmarks`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=postmark-map]");
  await shot("postmark_map.png");

  await page.goto(`${BASE}/rules`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=family-rules]");
  await shot("family_rules.png");

  await page.goto(`${BASE}/start`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=start-ring]");
  await shot("start_ring.png");

  await page.goto(`${BASE}/people/${ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=same-day-strip]");
  await shot("same_day.png");

  await page.goto(`${BASE}/archive/folders/1940`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=decade-folder]");
  await shot("decade_zip.png");

  await page.goto(`${BASE}/hour/empty`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=empty-hour-heading]");
  await shot("family_hour_empty.png");

  await page.goto(`${BASE}/letters/postage/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-postage-list]");
  await shot("postage_missing.png");

  await page.goto(`${BASE}/photos/duplicates/empty`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=empty-photo-duplicates-heading]");
  await shot("photo_duplicates_empty.png");

  await page.goto(`${BASE}/reunions/placecards/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-place-cards-list]");
  await shot("place_cards_missing.png");

  await page.goto(`${BASE}/sameday/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-same-day-list]");
  await shot("same_day_missing.png");

  await browser.close();
  writeFileSync(`${MEDIA}/family_hour_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui family-hour layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
