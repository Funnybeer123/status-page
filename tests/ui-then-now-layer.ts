import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-then-now");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker then-now" });
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
  const place = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Grange hall", locality: "Cedar Falls", region: "Iowa" }),
  });
  ids.place = place.body.place.id;
  const cedar = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" }),
  });
  ids.cedar = cedar.body.place.id;
  const thenPhoto = new FormData();
  thenPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "grange-then.svg");
  thenPhoto.set("title", "Harvest dance, Grange hall");
  thenPhoto.set("capturedAt", "1947-10-18T20:00:00Z");
  thenPhoto.set("placeId", ids.place);
  const savedThen = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: thenPhoto });
  ids.then = savedThen.body.asset.id;
  const nowPhoto = new FormData();
  nowPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "grange-now.svg");
  nowPhoto.set("title", "Grange hall today");
  nowPhoto.set("capturedAt", "2024-06-01T16:00:00Z");
  nowPhoto.set("placeId", ids.place);
  const savedNow = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: nowPhoto });
  await client.json("/api/pairs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "The Grange hall, then and now",
      thenAssetId: ids.then,
      nowAssetId: savedNow.body.asset.id,
      placeId: ids.place,
    }),
  });
  const picnic = new FormData();
  picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
  picnic.set("title", "Hart picnic, 1961");
  picnic.set("capturedAt", "1961-07-04T16:00:00Z");
  await client.json("/api/assets", { method: "POST", body: picnic });
  const undated = new FormData();
  undated.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "porch.svg");
  undated.set("title", "Undated porch");
  await client.json("/api/assets", { method: "POST", body: undated });
  const letter = new FormData();
  letter.set("title", "Harvest letter");
  letter.set("writtenAt", "1947-10-18");
  letter.set("transcript", "I danced three times with Samuel Hart from the north farm.");
  letter.set("personIds", ids.rose);
  const savedLetter = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = savedLetter.body.document.id;
  await client.json(`/api/letters/${ids.letter}/postmark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stampText: "Cedar Falls, Iowa", postmarkedAt: "1947-10-19" }),
  });
  const picnicLetter = new FormData();
  picnicLetter.set("title", "Picnic letter");
  picnicLetter.set("writtenAt", "1961-07-05");
  picnicLetter.set("transcript", "The cottonwoods held the picnic baskets.");
  picnicLetter.set("personIds", ids.rose);
  await client.json("/api/letters", { method: "POST", body: picnicLetter });
  const event = await client.json<{ event: { id: string } }>("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      kind: "other",
      title: "Harvest dance at the Grange hall",
      happenedOn: "1947-10-12",
      preferred: true,
    }),
  });
  await client.json("/api/citations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      claim: "The harvest dance was 12 October 1947.",
      personId: ids.rose,
      eventId: event.body.event.id,
      documentId: ids.letter,
      quality: "original",
    }),
  });
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.june,
      placeId: ids.cedar,
      startedAt: "1980-06-01",
      notes: "June still lives in Cedar Falls.",
    }),
  });
  await client.json("/api/phone-tree", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june, phone: "319-555-1956", callOrder: 1, notes: "Call first." }),
  });
  const album = await client.json<{ album: { id: string } }>("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Harvest years" }),
  });
  ids.album = album.body.album.id;
  await client.json(`/api/albums/${ids.album}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.then }),
  });
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker reunion at the Grange",
      place: "Grange hall, Cedar Falls",
      happenedOn: "2026-07-04",
      personIds: [ids.june, ids.blank],
    }),
  });
  ids.reunion = reunion.body.reunion.id;
  await client.json("/api/guestbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: "Maya Park visited and left Sunday rolls." }),
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

  await page.goto(`${BASE}/map/then-now`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=then-now-list]");
  await shot("then_now_map.png");

  await page.goto(`${BASE}/phone-tree`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=phone-tree-list]");
  await shot("family_phone_tree.png");

  await page.goto(`${BASE}/albums/${ids.album}/table`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=album-table-sheet]");
  await shot("album_table_sheet.png");

  await page.goto(`${BASE}/dates/preferred`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=preferred-dates]");
  await shot("preferred_date_confidence.png");

  await page.goto(`${BASE}/letters/${ids.letter}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=letter-postmark]");
  await shot("letter_postmark.png");

  await page.goto(`${BASE}/places/${ids.cedar}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=living-here-list]");
  await shot("people_living_here.png");

  await page.goto(`${BASE}/archive/folders`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=archive-folders]");
  await shot("archive_decade_folders.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/rsvp-card`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=rsvp-card]");
  await shot("reunion_rsvp_card.png");

  await page.goto(`${BASE}/letters/${ids.letter}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=cite-this-page]");
  await shot("cite_this_page.png");

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-guestbook]");
  await shot("home_guestbook.png");

  await page.goto(`${BASE}/map/then-now/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-then-now]");
  await shot("then_now_missing.png");

  await page.goto(`${BASE}/phone-tree/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-phones]");
  await shot("phone_tree_missing.png");

  await page.goto(`${BASE}/letters/postmarks/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-postmarks]");
  await shot("letters_missing_postmarks.png");

  await page.goto(`${BASE}/archive/folders/undated`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=undated-folder]");
  await shot("archive_undated_folder.png");

  await page.goto(`${BASE}/reunions/rsvp/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-rsvp]");
  await shot("reunion_rsvp_missing.png");

  await browser.close();
  writeFileSync(`${MEDIA}/then_now_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui then-now layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
