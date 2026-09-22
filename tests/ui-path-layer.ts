import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-path");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker path" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
    { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
  ]) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  for (const rel of [
    { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" },
    { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
    { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
    { fromPersonId: ids.helen, toPersonId: ids.maya, type: "parent" },
  ]) {
    await client.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rel),
    });
  }
  const letter = new FormData();
  letter.set("title", "June to Helen, millinery counter");
  letter.set("kind", "letter");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", ids.rose);
  await client.json("/api/letters", { method: "POST", body: letter });
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
  const picnic = new FormData();
  picnic.set("file", new Blob([makePhotoSvg("#4d5b3c")], { type: "image/svg+xml" }), "picnic.svg");
  picnic.set("title", "Whitaker picnic");
  picnic.set("capturedAt", "1961-07-04");
  picnic.set("personIds", ids.helen);
  const picnicAsset = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
  ids.picnic = picnicAsset.body.asset.id;
  await client.json("/api/photo-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.picnic, text: "Mother cuts the Sunday rolls", x: 40, y: 24 }),
  });
  await client.json("/api/households", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      year: 1940,
      place: "Cedar Falls",
      street: "Whitaker house",
      groupKey: "whitaker-cedar-falls",
      people: [{ personId: ids.rose, role: "daughter", age: 11 }],
    }),
  });
  await client.json("/api/households", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      year: 1950,
      place: "Cedar Falls",
      street: "North farm",
      groupKey: "whitaker-cedar-falls",
      people: [
        { personId: ids.rose, role: "wife", age: 21 },
        { personId: ids.louis, role: "head", age: 23, occupation: "farmer" },
      ],
    }),
  });
  const register = await client.json<{ register: { id: string } }>("/api/registers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      church: "St. John's",
      place: "Cedar Falls",
      lines: [
        { kind: "baptism", happenedOn: "1929-04-08", text: "Rose Whitaker baptised.", personId: ids.rose },
        { kind: "marriage", happenedOn: "1953-05-01", text: "Rose and Louis married.", personId: ids.rose, otherPersonId: ids.louis },
        { kind: "burial", happenedOn: "2008-11-05", text: "Rose buried at Fairview.", personId: ids.rose },
      ],
    }),
  });
  ids.register = register.body.register.id;
  const tax = await client.json<{ list: { id: string } }>("/api/tax", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      place: "Cedar Falls",
      year: 1950,
      names: [{ name: "Louis Whitaker", personId: ids.louis, amount: "$42.00" }],
    }),
  });
  ids.tax = tax.body.list.id;
  const voyage = await client.json<{ voyage: { id: string } }>("/api/voyages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ship: "SS Eastern Star",
      departedFrom: "Hong Kong",
      arrivedAt: "San Francisco",
      departedOn: "1972-03-04",
      passengers: [{ personId: ids.louis, age: 45, role: "passenger" }],
    }),
  });
  ids.voyage = voyage.body.voyage.id;
  await client.json("/api/searches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "harvest dance", query: "millinery" }),
  });
  await client.json("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.helen, granted: true }),
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

  await page.goto(`${BASE}/related?from=${ids.maya}&to=${ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=related-path]");
  await shot("path_related.png");

  await page.goto(`${BASE}/census/compare?group=whitaker-cedar-falls`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=census-compare]");
  await shot("path_census_compare.png");

  await page.goto(`${BASE}/registers/${ids.register}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=register-lines]");
  await shot("path_register.png");

  await page.goto(`${BASE}/tax/${ids.tax}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=tax-names]");
  await shot("path_tax.png");

  await page.goto(`${BASE}/voyages/${ids.voyage}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=passenger-list]");
  await shot("path_passengers.png");

  await page.goto(`${BASE}/tree/poster`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=tree-poster]");
  await shot("path_tree_poster.png");

  await page.goto(`${BASE}/searches`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=searches-list]");
  await shot("path_saved_searches.png");

  await page.goto(`${BASE}/archive/${ids.picnic}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=photo-note]");
  await shot("path_photo_note.png");

  await page.goto(`${BASE}/consent`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=consent-heading]");
  await shot("path_consent.png");

  await page.goto(`${BASE}/people/${ids.rose}/read`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=life-reading]");
  await shot("path_life_reading.png");

  await page.goto(`${BASE}/households`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=households-heading]");
  await shot("path_households.png");

  await page.goto(`${BASE}/extracts`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=extracts-heading]");
  await shot("path_extracts.png");

  await browser.close();
  writeFileSync(`${MEDIA}/path_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui path layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
