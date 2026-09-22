import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-attach");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker attach" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
    { key: "june", displayName: "June Whitaker", birthDate: "1956-04-01" },
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
    body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa", kind: "city" }),
  });
  ids.place = place.body.place.id;

  const scan1940 = new FormData();
  scan1940.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "census-1940.svg");
  scan1940.set("title", "1940 census page");
  const a = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: scan1940 });
  ids.scan1940 = a.body.asset.id;
  const scan1950 = new FormData();
  scan1950.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "census-1950.svg");
  scan1950.set("title", "1950 census page");
  const b = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: scan1950 });
  ids.scan1950 = b.body.asset.id;
  const manifest = new FormData();
  manifest.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "manifest.svg");
  manifest.set("title", "SS Eastern Star manifest");
  const c = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: manifest });
  ids.manifest = c.body.asset.id;

  const first = await client.json<{ household: { id: string } }>("/api/households", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      year: 1940,
      place: "Cedar Falls",
      street: "Whitaker house",
      groupKey: "whitaker-cedar-falls",
      personIds: [ids.rose],
    }),
  });
  ids.house1940 = first.body.household.id;
  const second = await client.json<{ household: { id: string } }>("/api/households", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      year: 1950,
      place: "Cedar Falls",
      street: "Whitaker house",
      groupKey: "whitaker-cedar-falls",
      personIds: [ids.rose, ids.louis],
    }),
  });
  ids.house1950 = second.body.household.id;
  await client.json("/api/households/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ householdId: ids.house1940, assetId: ids.scan1940 }),
  });
  await client.json("/api/households/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ householdId: ids.house1950, assetId: ids.scan1950 }),
  });

  const voyage = await client.json<{ voyage: { id: string } }>("/api/voyages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ship: "SS Eastern Star",
      departedFrom: "Hong Kong",
      arrivedAt: "San Francisco",
      departedOn: "1972-03-04",
      personIds: [ids.louis],
    }),
  });
  ids.voyage = voyage.body.voyage.id;
  await client.json("/api/voyages/manifest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voyageId: ids.voyage, assetId: ids.manifest }),
  });

  await client.json("/api/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      field: "burialPlot",
      proposedValue: "Fairview, plot near the cedar",
      note: "The parish book says the cedar.",
    }),
  });

  const branch = await client.json<{ branch: { id: string } }>("/api/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Cedar Falls Whitakers",
      personIds: [ids.rose, ids.louis],
    }),
  });
  ids.branch = branch.body.branch.id;

  await client.json("/api/cal/token", { method: "POST" });

  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Hart reunion at the north farm",
      place: "Cedar Falls",
      happenedOn: "2026-07-04",
      personIds: [ids.maya, ids.june],
    }),
  });
  ids.reunion = reunion.body.reunion.id;

  await client.json("/api/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "What I still remember of Grandma's cider",
      body: "She said the cider was too sweet. The cousins have not heard this yet.",
      recordedAt: "2026-03-12",
    }),
  });

  await client.json("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker house",
      line: "14 Market Street",
      locality: "Cedar Falls",
      placeId: ids.place,
      personIds: [ids.rose],
    }),
  });
  await client.json("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "The Whitaker house",
      line: "14 Market Street",
      locality: "Cedar Falls",
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

  await page.goto(`${BASE}/census/compare?group=whitaker-cedar-falls`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=census-scans]");
  await shot("census_scans.png");

  await page.goto(`${BASE}/voyages/${ids.voyage}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=voyage-manifest]");
  await shot("voyage_manifest.png");

  await page.goto(`${BASE}/suggestions`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=suggestions-list]");
  await shot("suggestions.png");

  await page.goto(`${BASE}/lives?a=${ids.rose}&b=${ids.louis}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=two-lives]");
  await shot("two_lives.png");

  await page.goto(`${BASE}/branches`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=branch-gedcom]");
  await shot("branch_gedcom.png");

  await page.goto(`${BASE}/calendar/subscribe`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=webcal-link]");
  await shot("webcal.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/tags`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=name-tags]");
  await shot("name_tags.png");

  await page.goto(`${BASE}/journal`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=journal-list]");
  await shot("journal.png");

  await page.goto(`${BASE}/places/${ids.place}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=place-chronicle]");
  await shot("place_chronicle.png");

  await page.goto(`${BASE}/homes/merge`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-merge-form]");
  await shot("home_merge.png");

  await page.goto(`${BASE}/homes/duplicates`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-duplicates-list]");
  await shot("home_duplicates.png");

  await page.goto(`${BASE}/scans/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-scans-heading]");
  await shot("missing_scans.png");

  await page.goto(`${BASE}/manifests/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-manifests-heading]");
  await shot("missing_manifests.png");

  await page.goto(`${BASE}/suggestions/history`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=suggestion-history-heading]");
  await shot("suggestion_history.png");

  await browser.close();
  writeFileSync(`${MEDIA}/attach_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui attach layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
