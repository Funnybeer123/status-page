import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-memory-lane");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker memory-lane" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  const today = new Date();
  const todayStamp = `${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: `1956-${todayStamp}` },
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
    body: JSON.stringify({
      personId: ids.rose,
      placeId: ids.cedar,
      startedAt: "1929-03-08",
      endedAt: "1948-06-14",
    }),
  });
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      placeId: ids.farm,
      startedAt: "1948-06-14",
      endedAt: "2008-11-02",
    }),
  });
  const porch = new FormData();
  porch.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "porch.svg");
  porch.set("title", "Whitaker porch");
  porch.set("capturedAt", "1935-06-01T16:00:00Z");
  porch.set("personIds", ids.rose);
  const savedPorch = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: porch });
  ids.porch = savedPorch.body.asset.id;
  await client.json("/api/photos/place", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.porch, placeId: ids.cedar }),
  });
  const picnic = new FormData();
  picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
  picnic.set("title", "Hart picnic, 1961");
  picnic.set("capturedAt", "1961-07-04T16:00:00Z");
  const savedPicnic = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
  ids.picnic = savedPicnic.body.asset.id;
  await client.json("/api/photos/place", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.picnic, placeId: ids.farm }),
  });
  const dance = new FormData();
  dance.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "dance.svg");
  dance.set("title", "Harvest dance, Grange hall");
  dance.set("capturedAt", "1947-10-18T20:00:00Z");
  const savedDance = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: dance });
  ids.dance = savedDance.body.asset.id;
  await client.json("/api/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.dance, weather: "A hard frost, then a clear night for the fiddle." }),
  });
  const letter = new FormData();
  letter.set("title", "Harvest letter");
  letter.set("writtenAt", "1947-10-18");
  letter.set("transcript", "The Grange hall held its harvest dance, the cider was too sweet, and he walked her home past the cottonwoods.");
  letter.set("personIds", ids.rose);
  const savedLetter = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = savedLetter.body.document.id;
  await client.json("/api/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: ids.letter, weather: "The family remembered a hard frost the morning after." }),
  });
  const review = new FormData();
  review.set("title", "Ruth to Eleanor, still smudged");
  review.set("writtenAt", "1947-10-22");
  review.set("transcript", "The stamp is hard to read.");
  review.set("needsReview", "true");
  review.set("personIds", ids.rose);
  const savedReview = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: review });
  ids.review = savedReview.body.document.id;
  await client.json("/api/ocr/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: ids.review, needsReview: true }),
  });
  await client.json("/api/ocr/confidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: ids.review, ocrConfidence: 62 }),
  });
  const secret = new FormData();
  secret.set("title", "For Lily, not yet");
  secret.set("writtenAt", "1948-10-18");
  secret.set("transcript", "I still have the hatband in the drawer.");
  secret.set("personIds", ids.june);
  const savedSecret = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: secret });
  ids.secret = savedSecret.body.document.id;
  await client.json("/api/secrets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: ids.secret, secretUntil: "2030-01-01" }),
  });
  const album = await client.json<{ album: { id: string } }>("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Harvest years" }),
  });
  ids.album = album.body.album.id;
  await client.json("/api/borrowed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.picnic, albumId: ids.album }),
  });
  const film = new FormData();
  film.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic-film.svg");
  film.set("title", "Picnic home movie, 1961");
  film.set("kind", "video");
  const savedFilm = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: film });
  ids.film = savedFilm.body.asset.id;
  await client.json("/api/films/captions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filmId: ids.film, seconds: "0:12", text: "Mother is cutting Sunday rolls under the cottonwoods." }),
  });
  await client.json("/api/later-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "address",
      personId: ids.june,
      label: "June on Market Street",
      line: "14 Market Street",
      locality: "Cedar Falls",
      region: "Iowa",
    }),
  });
  const branch = await client.json<{ branch: { id: string } }>("/api/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "the Cedar Falls Harts", personIds: [ids.rose, ids.june] }),
  });
  await client.json("/api/branches/color", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchId: branch.body.branch.id, color: "#4d5b3c" }),
  });
  await client.json("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker reunion at the Grange",
      place: "Grange hall",
      happenedOn: new Date().toISOString().slice(0, 10),
      personIds: [ids.june],
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

  await page.goto(`${BASE}/people/${ids.rose}/lane`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=memory-lane-list]");
  await shot("memory_lane.png");

  await page.goto(`${BASE}/crossword`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=crossword-list]");
  await shot("family_crossword.png");

  await page.goto(`${BASE}/letters/${ids.letter}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=letter-weather]");
  await shot("weather_note.png");

  await page.goto(`${BASE}/archive/${ids.picnic}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=borrowed-from]");
  await shot("borrowed_from.png");

  await page.goto(`${BASE}/films/${ids.film}/captions`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=film-captions]");
  await shot("film_captions.png");

  await page.goto(`${BASE}/addresses/book`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=address-book]");
  await shot("address_book.png");

  await page.goto(`${BASE}/letters/${ids.secret}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=letter-secret-until]");
  await shot("kept_secret_until.png");

  await page.goto(`${BASE}/branches/legend`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=branch-legend]");
  await shot("branch_color_legend.png");

  await page.goto(`${BASE}/letters/${ids.review}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=letter-ocr-confidence]");
  await shot("ocr_confidence.png");

  await page.goto(`${BASE}/digest`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=digest-preview]");
  await shot("start_of_day_digest.png");

  await page.goto(`${BASE}/lanes/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-lanes]");
  await shot("memory_lane_missing.png");

  await page.goto(`${BASE}/weather/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-weather]");
  await shot("weather_missing.png");

  await page.goto(`${BASE}/borrowed/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=uncredited-list]");
  await shot("borrowed_missing.png");

  await page.goto(`${BASE}/secrets/locked`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=locked-secrets]");
  await shot("locked_secrets.png");

  await page.goto(`${BASE}/digest/empty`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=empty-digest-heading]");
  await shot("empty_digest.png");

  await browser.close();
  writeFileSync(`${MEDIA}/memory_lane_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui memory-lane layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
