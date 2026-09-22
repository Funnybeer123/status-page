import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-township");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker township" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
    { key: "ned", displayName: "Cousin Ned", givenName: "Ned", familyName: "Whitaker" },
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
  await client.json("/api/fences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, neighbors: "Whitaker and Chen", walkedOn: "1949-04-12" }),
  });
  await client.json("/api/road-tax", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, road: "north township road", days: 3, year: 1952 }),
  });
  await client.json("/api/creamery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, pounds: "40 pounds", amount: "$8.20", paidOn: "1961-06-15" }),
  });
  await client.json("/api/rods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, building: "north-farm barn", year: 1949 }),
  });
  await client.json("/api/maple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, gallons: "12 gallons", year: 1951, place: "north-farm grove" }),
  });
  const husking = await client.json<{ bee: { id: string } }>("/api/husking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: ids.louis, heldOn: "1950-10-20" }),
  });
  await client.json("/api/husking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beeId: husking.body.bee.id, personId: ids.june }),
  });
  await client.json("/api/husking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: ids.rose }),
  });
  await client.json("/api/midwives", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ midwifeId: ids.rose, motherId: ids.june, childId: ids.ned, attendedOn: "1984-07-21" }),
  });
  await client.json("/api/carvers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carverId: ids.june, personId: ids.rose, yard: "Fairview" }),
  });
  const charivari = await client.json<{ charivari: { id: string } }>("/api/charivari", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Chen wedding", heldOn: "1978-06-10" }),
  });
  await client.json("/api/charivari", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ charivariId: charivari.body.charivari.id, personId: ids.louis, noise: "a tin pan" }),
  });
  await client.json("/api/charivari", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Quiet wedding" }),
  });
  await client.json("/api/brands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, mark: "H-bar", startedOn: "1949-01-01", endedOn: "1978-12-31" }),
  });
  await client.json("/api/sorghum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, gallons: "8 gallons", year: 1950, place: "north farm" }),
  });
  await client.json("/api/sick", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sickId: ids.rose, personId: ids.june, satOn: "2008-10-01" }),
  });
  await client.json("/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, office: "director", startedOn: "1952-01-01", endedOn: "1958-12-31" }),
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

  const shots: [string, string, string][] = [
    ["/fences", "[data-testid=fences-list]", "fence_viewer.png"],
    ["/road-tax", "[data-testid=road-tax-list]", "road_tax.png"],
    ["/creamery", "[data-testid=creamery-list]", "creamery_check.png"],
    ["/rods", "[data-testid=rods-list]", "lightning_rod.png"],
    ["/maple", "[data-testid=maple-list]", "maple_sugar.png"],
    ["/husking", "[data-testid=husking-roll]", "husking_bee.png"],
    ["/midwives", "[data-testid=midwives-list]", "midwife.png"],
    ["/carvers", "[data-testid=carvers-list]", "headstone_carver.png"],
    ["/charivari", "[data-testid=charivari-roll]", "charivari.png"],
    ["/brands", "[data-testid=brands-list]", "cattle_brand.png"],
    ["/sorghum", "[data-testid=sorghum-list]", "sorghum_boil.png"],
    ["/sick", "[data-testid=sick-list]", "sick_watch.png"],
    ["/boards", "[data-testid=boards-list]", "school_board.png"],
    ["/husking/missing", "[data-testid=missing-husking-heading]", "missing_husking.png"],
    ["/charivari/missing", "[data-testid=missing-charivari-list]", "missing_charivari.png"],
  ];
  for (const [path, selector, name] of shots) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
    await page.waitForSelector(selector);
    await shot(name);
  }

  await browser.close();
  writeFileSync(`${MEDIA}/township_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui township layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
