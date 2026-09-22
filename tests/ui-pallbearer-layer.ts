import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-pallbearer");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker pallbearers" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
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
  const rosePhoto = new FormData();
  rosePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
  rosePhoto.set("title", "Rose at the Grange hall");
  rosePhoto.set("capturedAt", "1947-10-18T20:00:00Z");
  rosePhoto.set("personIds", ids.rose);
  const savedRose = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: rosePhoto });
  await client.json("/api/pallbearers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deceasedId: ids.rose, personId: ids.june, role: "head" }),
  });
  await client.json("/api/pallbearers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deceasedId: ids.rose, personId: ids.blank, role: "left" }),
  });
  const gown = await client.json<{ gown: { id: string } }>("/api/gowns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Whitaker christening gown" }),
  });
  await client.json("/api/gowns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gownId: gown.body.gown.id, personId: ids.rose, wornOn: "1929-03-08" }),
  });
  await client.json("/api/gowns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gownId: gown.body.gown.id, personId: ids.june, wornOn: "1956-04-01" }),
  });
  await client.json("/api/ice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, year: 1947, place: "Cedar River", role: "pike" }),
  });
  await client.json("/api/cameras", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: savedRose.body.asset.id, personId: ids.june }),
  });
  await client.json("/api/spellings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surname: "Whitaker", variant: "Whiticker", source: "1930 census" }),
  });
  await client.json("/api/threshing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, year: 1948, place: "North farm", role: "bundle pitcher" }),
  });
  await client.json("/api/last-seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, lastSeenOn: "2008-10-01" }),
  });
  await client.json("/api/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      school: "Cedar Falls High",
      year: 1984,
      personIds: [ids.blank],
      teacherId: ids.june,
    }),
  });
  await client.json("/api/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ school: "Cedar Falls High", year: 1945, personIds: [ids.rose] }),
  });
  await client.json("/api/vehicles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "North-farm truck",
      kind: "truck",
      personId: ids.louis,
      startedOn: "1952-01-01",
      endedOn: "1978-12-31",
    }),
  });
  await client.json("/api/party-lines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exchange: "Cedar Falls", number: "4-218", personIds: [ids.rose, ids.louis] }),
  });
  const route = await client.json<{ route: { id: string } }>("/api/milk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Cedar Falls dairy", year: 1961 }),
  });
  await client.json("/api/milk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routeId: route.body.route.id, personId: ids.louis, stopOrder: 1 }),
  });
  await client.json("/api/pews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, church: "St. John's", pewNumber: "12" }),
  });
  await client.json("/api/blankets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, monthDay: "December 24", placedById: ids.june }),
  });
  return { email };
}

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const { email } = await prepare();
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

  await page.goto(`${BASE}/pallbearers`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=pallbearers-list]");
  await shot("pallbearers.png");

  await page.goto(`${BASE}/gowns`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=gown-chain]");
  await shot("gown_chain.png");

  await page.goto(`${BASE}/ice`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=ice-list]");
  await shot("ice_harvest.png");

  await page.goto(`${BASE}/cameras`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=cameras-list]");
  await shot("photographer.png");

  await page.goto(`${BASE}/spellings`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=spellings-list]");
  await shot("surname_spellings.png");

  await page.goto(`${BASE}/threshing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=threshing-list]");
  await shot("threshing_ring.png");

  await page.goto(`${BASE}/last-seen`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=last-seen-list]");
  await shot("last_seen.png");

  await page.goto(`${BASE}/teachers`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=teachers-list]");
  await shot("schoolteacher.png");

  await page.goto(`${BASE}/vehicles`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=vehicles-list]");
  await shot("vehicle_log.png");

  await page.goto(`${BASE}/party-lines`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=party-lines-list]");
  await shot("party_line.png");

  await page.goto(`${BASE}/milk`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=milk-list]");
  await shot("milk_route.png");

  await page.goto(`${BASE}/pews`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=pews-list]");
  await shot("church_pew.png");

  await page.goto(`${BASE}/blankets`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=blankets-list]");
  await shot("grave_blanket.png");

  await page.goto(`${BASE}/pallbearers/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-pallbearers-heading]");
  await shot("missing_pallbearers.png");

  await page.goto(`${BASE}/teachers/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-teachers-list]");
  await shot("missing_teachers.png");

  await browser.close();
  writeFileSync(`${MEDIA}/pallbearer_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui pallbearer layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
