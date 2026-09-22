import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg, makeWav } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

function tomorrowBirthDate(from = new Date()) {
  const next = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1));
  const month = String(next.getUTCMonth() + 1).padStart(2, "0");
  const day = String(next.getUTCDate()).padStart(2, "0");
  return `1954-${month}-${day}`;
}

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-chapters");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker chapters" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "helen", displayName: "Helen Park", birthDate: tomorrowBirthDate() },
  ]) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  await client.json("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" }),
  });
  const letter = new FormData();
  letter.set("title", "June to Helen, millinery counter");
  letter.set("kind", "letter");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", ids.rose);
  await client.json("/api/letters", { method: "POST", body: letter });
  const faded = new FormData();
  faded.set("title", "Faded scan of Rose");
  faded.set("kind", "letter");
  faded.set("needsReview", "true");
  faded.set("personIds", ids.rose);
  await client.json("/api/letters", { method: "POST", body: faded });
  const girl = new FormData();
  girl.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "girl.svg");
  girl.set("title", "Rose as a girl");
  girl.set("capturedAt", "1936-06-14");
  girl.set("personIds", ids.rose);
  await client.json("/api/assets", { method: "POST", body: girl });
  await client.json("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Sunday rolls in later years",
      body: "Rose kept the navy-blue bowl.",
      recordedAt: "2001-04-02",
      tellerPersonId: ids.rose,
      personIds: [ids.rose],
    }),
  });
  await client.json(`/api/people/${ids.rose}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerNote: "The cedar chest key is in the upstairs desk.",
      causeOfDeath: "Pneumonia",
      languages: "English, Czech",
    }),
  });
  await client.json("/api/cemeteries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Fairview Cemetery", locality: "Cedar Falls", region: "Iowa", latitude: 42.541, longitude: -92.448 }),
  });
  const home = await client.json<{ home: { id: string } }>("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "North farm house", locality: "Cedar Falls", region: "Iowa" }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "land",
      personId: ids.louis,
      title: "North farm",
      place: "Cedar Falls, Iowa",
      abstract: "The north forty stayed with the children after the 1948 deed.",
      homeId: home.body.home.id,
    }),
  });
  const unit = await client.json<{ unit: { id: string } }>("/api/military/units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Black Hawk County draft board", branch: "Army" }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "military", personId: ids.louis, branch: "Army", unitId: unit.body.unit.id, rank: "Clerk" }),
  });
  const film = new FormData();
  film.set("file", new Blob([makeWav()], { type: "video/mp4" }), "picnic.mp4");
  film.set("title", "Picnic home movie");
  film.set("kind", "video");
  const asset = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: film });
  await client.json("/api/films/moments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: asset.body.asset.id, seconds: "1:23", title: "Mother cuts the Sunday rolls" }),
  });
  await client.json("/api/later-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "hymn", title: "Abide with Me", verse: "Fast falls the eventide." }),
  });
  await client.json("/api/later-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "farm", title: "North farm", homeId: home.body.home.id }),
  });
  await client.json("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, kind: "baptism", title: "Rose baptized at St. John's", happenedOn: "1929-04-08" }),
  });
  return { email, ids, homeId: home.body.home.id, unitId: unit.body.unit.id, filmId: asset.body.asset.id };
}

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const { email, ids, homeId, unitId, filmId } = await prepare();
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    headless: true,
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

  await page.goto(`${BASE}/people/${ids.rose}/chapters`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=chapters-heading]");
  await shot("chapters_life.png");

  await page.goto(`${BASE}/inbox`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=inbox-heading]");
  await shot("chapters_inbox.png");

  await page.goto(`${BASE}/people/${ids.rose}/search?q=millinery`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=person-search-heading]");
  await shot("chapters_person_search.png");

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=tomorrow-reminder]");
  await shot("chapters_tomorrow_home.png");

  await page.goto(`${BASE}/tomorrow`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=tomorrow-heading]");
  await shot("chapters_tomorrow.png");

  await page.goto(`${BASE}/cemeteries/map`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=cemetery-map-heading]");
  await shot("chapters_cemetery_map.png");

  await page.goto(`${BASE}/tree`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=tree-svg-download]");
  await shot("chapters_tree_svg.png");

  await page.goto(`${BASE}/films`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=films-heading]");
  await shot("chapters_films.png");

  await page.goto(`${BASE}/archive/${filmId}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=film-moments]");
  await shot("chapters_film_moments.png");

  await page.goto(`${BASE}/homes/${homeId}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-abstracts]");
  await shot("chapters_land_home.png");

  await page.goto(`${BASE}/abstracts`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=abstracts-heading]");
  await shot("chapters_abstracts.png");

  await page.goto(`${BASE}/military/units/${unitId}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=unit-heading]");
  await shot("chapters_unit.png");

  await page.goto(`${BASE}/people/${ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=owner-note]");
  await shot("chapters_owner_note.png");

  await page.goto(`${BASE}/hymns`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=hymns-heading]");
  await shot("chapters_hymns.png");

  await page.goto(`${BASE}/farms`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=farms-heading]");
  await shot("chapters_farms.png");

  await page.goto(`${BASE}/baptisms`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=baptisms-heading]");
  await shot("chapters_baptisms.png");

  await page.goto(`${BASE}/languages`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=languages-heading]");
  await shot("chapters_languages.png");

  await browser.close();
  writeFileSync(`${MEDIA}/chapters_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui chapters layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
