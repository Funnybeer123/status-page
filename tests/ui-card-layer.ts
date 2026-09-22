import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg, makeWav } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-card");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker cards" });
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
  const cedar = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa", gps: "42.5278 N, 92.4453 W" }),
  });
  ids.cedar = cedar.body.place.id;
  const city = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Iowa City", locality: "Iowa City", region: "Iowa", gps: "41.6611 N, 91.5302 W" }),
  });
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, placeId: ids.cedar, startedAt: "1948-06-14" }),
  });
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, placeId: city.body.place.id, startedAt: "1946-09-01" }),
  });
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
  await client.json(`/api/letters/${ids.letter}/fragile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fragile: true }),
  });
  const dance = new FormData();
  dance.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "dance.svg");
  dance.set("title", "Harvest dance, 1947");
  dance.set("capturedAt", "1947-10-18T20:00:00Z");
  dance.set("personIds", ids.rose);
  const savedDance = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: dance });
  ids.dance = savedDance.body.asset.id;
  const picnic = new FormData();
  picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
  picnic.set("title", "Hart picnic, 1961");
  picnic.set("capturedAt", "1961-07-04T16:00:00Z");
  picnic.set("personIds", ids.rose);
  await client.json("/api/assets", { method: "POST", body: picnic });
  const reel = new FormData();
  reel.set("file", new Blob([makeWav()], { type: "audio/wav" }), "picnic.wav");
  reel.set("title", "Picnic reel");
  reel.set("kind", "audio");
  reel.set("capturedAt", "1961-07-04T17:00:00Z");
  reel.set("personIds", ids.rose);
  await client.json("/api/assets", { method: "POST", body: reel });
  const album = await client.json<{ album: { id: string } }>("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Harvest years" }),
  });
  ids.album = album.body.album.id;
  await client.json(`/api/albums/${ids.album}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.dance }),
  });
  const cited = await client.json<{ citation: { id: string } }>("/api/citations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      claim: "Rose danced at the harvest dance in 1947.",
      personId: ids.rose,
      documentId: ids.letter,
      assetId: ids.dance,
    }),
  });
  ids.citation = cited.body.citation.id;
  await client.json("/api/citations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim: "Cousin Ned still needs a photograph.", personId: ids.blank }),
  });
  await client.json("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Empty tray" }),
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

  await page.goto(`${BASE}/people/${ids.rose}/card`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=index-card]");
  await shot("index_card.png");

  await page.goto(`${BASE}/people/${ids.rose}/filmstrip`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=filmstrip-list]");
  await shot("person_filmstrip.png");

  await page.goto(`${BASE}/letters/${ids.letter}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=fragile-original]");
  await shot("fragile_original.png");

  await page.goto(`${BASE}/oral/playlist`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=oral-playlist]");
  await shot("oral_playlist.png");

  await page.goto(`${BASE}/map/compare?a=${ids.rose}&b=${ids.louis}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=residence-compare-heading]");
  await shot("residence_compare.png");

  await page.goto(`${BASE}/thanks`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=thanks-note]");
  await shot("thank_you_note.png");

  await page.goto(`${BASE}/proof/${ids.citation}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=proof-heading]");
  await shot("proof_board.png");

  await page.goto(`${BASE}/albums/${ids.album}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=album-zip-link]");
  await shot("album_zip.png");

  await page.goto(`${BASE}/generations`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=generations-chart]");
  await shot("generation_chart.png");

  await page.goto(`${BASE}/quiet`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=quiet-toggle]");
  await page.click("[data-testid=quiet-toggle] button");
  await page.waitForSelector("[data-testid=quiet-heading]");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=quiet-home-heading]");
  await shot("quiet_mode.png");

  await page.goto(`${BASE}/cards/missing-parents`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-parents]");
  await shot("cards_missing_parents.png");

  await page.goto(`${BASE}/filmstrips/empty`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=empty-filmstrips]");
  await shot("filmstrips_empty.png");

  await page.goto(`${BASE}/letters/not-fragile`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=not-fragile-letters]");
  await shot("letters_not_fragile.png");

  await page.goto(`${BASE}/proof/bare`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=bare-proof]");
  await shot("proof_bare.png");

  await page.goto(`${BASE}/albums/empty`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=empty-albums]");
  await shot("albums_empty.png");

  await browser.close();
  writeFileSync(`${MEDIA}/card_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui card layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
