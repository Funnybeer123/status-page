import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg, makeWav } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-firsts");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker firsts" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "ada", displayName: "Ada Whitaker", givenName: "Ada", familyName: "Whitaker", birthDate: "1901-02-02", deathDate: "1982-05-09" },
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
  for (const rel of [
    { fromPersonId: ids.ada, toPersonId: ids.rose, type: "parent" },
    { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner" },
    { fromPersonId: ids.rose, toPersonId: ids.june, type: "parent" },
  ]) {
    await client.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rel),
    });
  }
  for (const event of [
    { title: "The Cedar Falls bungalow", firstTag: "house", happenedOn: "1948-06-20" },
    { title: "The navy Ford", firstTag: "car", happenedOn: "1950-05-01" },
    { title: "June was born", firstTag: "child", happenedOn: "1956-04-01" },
  ]) {
    await client.json("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, kind: "other", ...event }),
    });
  }
  const first = new FormData();
  first.set("title", "Harvest letter");
  first.set("writtenAt", "1947-10-18");
  first.set("transcript", "I danced three times with Samuel Hart from the north farm.");
  first.set("personIds", ids.rose);
  const letter = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
  ids.letter = letter.body.document.id;
  const picnicLetter = new FormData();
  picnicLetter.set("title", "Picnic letter");
  picnicLetter.set("writtenAt", "1961-07-05");
  picnicLetter.set("transcript", "The cottonwoods held the picnic baskets.");
  picnicLetter.set("personIds", ids.rose);
  await client.json("/api/letters", { method: "POST", body: picnicLetter });
  const envelopeScan = new FormData();
  envelopeScan.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "envelope.svg");
  envelopeScan.set("title", "Harvest letter envelope");
  const savedEnvelope = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: envelopeScan });
  await client.json(`/api/letters/${ids.letter}/envelope`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      envelopeFrom: "Rose Whitaker, Cedar Falls",
      envelopeTo: "Ruth Whitaker",
      envelopeAssetId: savedEnvelope.body.asset.id,
    }),
  });
  const dance = new FormData();
  dance.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "dance.svg");
  dance.set("title", "Harvest dance, 1947");
  dance.set("capturedAt", "1947-10-18T20:00:00Z");
  dance.set("personIds", ids.rose);
  await client.json("/api/assets", { method: "POST", body: dance });
  const picnic = new FormData();
  picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
  picnic.set("title", "Hart picnic, 1961");
  picnic.set("capturedAt", "1961-07-04T16:00:00Z");
  picnic.set("personIds", ids.rose);
  const savedPicnic = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
  ids.picnic = savedPicnic.body.asset.id;
  const cleaned = new FormData();
  cleaned.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic-cleaned.svg");
  cleaned.set("title", "Hart picnic, cleaned");
  const savedCleaned = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: cleaned });
  const restore = await client.json<{ restore: { id: string } }>("/api/restores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Hart picnic, 1961",
      originalId: ids.picnic,
      cleanedId: savedCleaned.body.asset.id,
    }),
  });
  ids.restore = restore.body.restore.id;
  const spoken = new FormData();
  spoken.set("file", new Blob([makeWav()], { type: "audio/wav" }), "rose.wav");
  spoken.set("title", "Rose, said out loud");
  spoken.set("kind", "audio");
  const savedSpoken = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: spoken });
  await client.json(`/api/people/${ids.rose}/spoken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: savedSpoken.body.asset.id }),
  });
  const holiday = await client.json<{ record: { id: string } }>("/api/later-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "holiday", title: "Harvest-dance anniversary supper", season: "October" }),
  });
  await client.json("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Sunday rolls",
      body: "Warm milk, a cake of yeast, and the navy-blue bowl.",
      personIds: [ids.rose],
      holidayId: holiday.body.record.id,
    }),
  });
  await client.json("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Weeknight soup",
      body: "Whatever was left after the harvest.",
      personIds: [ids.blank],
    }),
  });
  await client.json("/api/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Ancestry login", body: "Shared family account. Owners only." }),
  });
  await client.json("/api/citations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      claim: "Rose danced at the harvest dance in 1947.",
      personId: ids.rose,
      documentId: ids.letter,
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

  await page.goto(`${BASE}/scrapbook`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=scrapbook-list]");
  await shot("firsts_scrapbook.png");

  await page.goto(`${BASE}/people/${ids.rose}/pedigree`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=drawn-pedigree]");
  await shot("drawn_pedigree.png");

  await page.goto(`${BASE}/letters/${ids.letter}/envelope`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=envelope-card]");
  await shot("letter_envelope.png");

  await page.goto(`${BASE}/vault`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=vault-list]");
  await shot("family_vault.png");

  await page.goto(`${BASE}/births/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-births]");
  await shot("missing_birth_dates.png");

  await page.goto(`${BASE}/restores/${ids.restore}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=restore-slider]");
  await shot("restore_slider.png");

  await page.goto(`${BASE}/recipes`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=recipes-list]");
  await shot("recipe_holiday.png");

  await page.goto(`${BASE}/soundboard`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=soundboard-list]");
  await shot("name_soundboard.png");

  await page.goto(`${BASE}/people/${ids.rose}/booklet`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=booklet-chapters]");
  await shot("packet_booklet.png");

  await page.goto(`${BASE}/quiet`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=quiet-toggle]");
  await page.click("[data-testid=quiet-toggle] button");
  await page.waitForSelector("[data-testid=night-toggle]");
  await page.click("[data-testid=night-toggle] button");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=night-quiet-heading]");
  await shot("night_quiet.png");

  await page.goto(`${BASE}/letters/envelopes/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-envelopes]");
  await shot("letters_missing_envelopes.png");

  await page.goto(`${BASE}/recipes/untagged`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=untagged-recipes]");
  await shot("recipes_untagged.png");

  await page.goto(`${BASE}/pedigree/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-pedigree]");
  await shot("pedigree_missing_parents.png");

  await page.goto(`${BASE}/soundboard/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-spoken]");
  await shot("spoken_names_missing.png");

  await page.goto(`${BASE}/recipes/holidays`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=holiday-cookbook]");
  await shot("holiday_cookbook.png");

  await browser.close();
  writeFileSync(`${MEDIA}/firsts_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui firsts layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
