import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-year");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker year" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
    { key: "june", displayName: "June Whitaker", birthDate: "1956-04-01" },
    { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
    { key: "hugh", displayName: "Hugh Whitaker", birthDate: "1924-02-02", deathDate: "2026-03-01" },
    { key: "ivy", displayName: "Ivy Park", givenName: "Ivy", familyName: "Park", birthDate: "2026-01-15" },
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
    body: JSON.stringify({ personId: ids.maya }),
  });
  await client.json("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Sunday rolls from Maya",
      body: "Maya still makes the navy-blue bowl of Sunday rolls.",
      recordedAt: "2026-03-12",
      tellerPersonId: ids.maya,
      personIds: [ids.maya],
    }),
  });
  const picnic = new FormData();
  picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "reunion.svg");
  picnic.set("title", "Reunion picnic");
  picnic.set("capturedAt", "2026-07-04");
  picnic.set("personIds", ids.maya);
  await client.json("/api/assets", { method: "POST", body: picnic });

  const event = await client.json<{ event: { id: string } }>("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.maya,
      kind: "reunion",
      title: "Hart reunion at the north farm",
      happenedOn: "2026-07-04",
    }),
  });
  ids.reunion = event.body.event.id;
  await client.json("/api/there", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId: ids.reunion, personId: ids.maya }),
  });

  await client.json("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Ask June who kept the millinery ledger",
      personId: ids.rose,
      assigneeId: ids.june,
    }),
  });
  await client.json("/api/digitize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Helen’s class photo, still in the hall drawer",
      kind: "photo",
      assigneeId: ids.helen,
    }),
  });

  const home = await client.json<{ home: { id: string } }>("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Whitaker house", line: "14 Market Street", locality: "Cedar Falls" }),
  });
  ids.home = home.body.home.id;
  await client.json("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ homeId: ids.home, personId: ids.rose, startedOn: "1948-06-14", endedOn: "1950-12-31" }),
  });
  await client.json("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ homeId: ids.home, personId: ids.louis, startedOn: "1949-01-01", endedOn: "1951-12-31" }),
  });

  await client.json("/api/directory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Whitaker, Rose",
      occupation: "milliner",
      address: "Above the millinery counter",
      year: 1950,
      personId: ids.rose,
    }),
  });

  const service = await client.json<{ record: { id: string } }>("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "military",
      personId: ids.louis,
      branch: "Army",
      unit: "Black Hawk County draft board",
      startedOn: "1944-09-22",
    }),
  });
  await client.json("/api/military/papers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.louis,
      serviceId: service.body.record.id,
      kind: "draft",
      year: 1944,
    }),
  });

  const row = await client.json<{ class: { id: string } }>("/api/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      school: "Cedar Falls High",
      year: 1945,
      place: "Cedar Falls, Iowa",
      personIds: [ids.rose, ids.louis],
    }),
  });
  ids.class = row.body.class.id;

  await client.json("/api/banner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bannerText: "The Whitakers of Cedar Falls",
      bannerNote: "She called the cider too sweet.",
    }),
  });

  return { email, ids };
}

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const { email, ids } = await prepare();
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

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=family-banner]");
  await shot("family_banner.png");

  await page.goto(`${BASE}/year?year=2026`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=this-year-list]");
  await shot("this_year.png");

  await page.goto(`${BASE}/assigned?personId=${ids.june}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=assigned-list]");
  await shot("assigned.png");

  await page.goto(`${BASE}/search/sounds?q=Whiticker`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=phonetic-list]");
  await shot("phonetic_search.png");

  await page.goto(`${BASE}/homes/${ids.home}/years`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-years-list]");
  await shot("home_years.png");

  await page.goto(`${BASE}/city-directory`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=city-directory-list]");
  await shot("city_directory.png");

  await page.goto(`${BASE}/military/papers`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=military-papers-list]");
  await shot("military_papers.png");

  await page.goto(`${BASE}/classes/${ids.class}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=class-pupils]");
  await shot("class_list.png");

  await page.goto(`${BASE}/there`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=there-list]");
  await shot("i_was_there.png");

  await page.goto(`${BASE}/start/progress`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=start-progress-heading]");
  await shot("start_progress.png");

  await page.goto(`${BASE}/year/photos?year=2026`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=yearbook-list]");
  await shot("yearbook.png");

  await page.goto(`${BASE}/classes/mates?personId=${ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=classmates-list]");
  await shot("classmates.png");

  await page.goto(`${BASE}/city-directory/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=city-directory-missing-list]");
  await shot("city_directory_missing.png");

  await page.goto(`${BASE}/there/suggest`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=there-suggest-heading]");
  await shot("there_suggest.png");

  await browser.close();
  writeFileSync(`${MEDIA}/year_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui year layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
