import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-shelling");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker shelling" });
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
  const shelling = await client.json<{ bee: { id: string } }>("/api/shelling", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: ids.louis, heldOn: "1950-11-12" }),
  });
  await client.json("/api/shelling", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beeId: shelling.body.bee.id, personId: ids.june }),
  });
  await client.json("/api/shelling", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId: ids.rose }),
  });
  await client.json("/api/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lenderId: ids.louis, borrowerId: ids.ned, purpose: "harvest hauling", loanedOn: "1950-10-08" }),
  });
  await client.json("/api/smokehouse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, item: "hams", hungOn: "1951-11-20" }),
  });
  const assessment = await client.json<{ assessment: { id: string } }>("/api/assessments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company: "Cedar Falls Farmers Mutual", loss: "barn fire", assessedOn: "1952-03-04" }),
  });
  await client.json("/api/assessments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assessmentId: assessment.body.assessment.id, personId: ids.louis, paid: "$4.50" }),
  });
  const cellar = await client.json<{ cellar: { id: string } }>("/api/cellars", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storm: "1947 tornado", heldOn: "1947-06-21" }),
  });
  await client.json("/api/cellars", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cellarId: cellar.body.cellar.id, personId: ids.rose }),
  });
  await client.json("/api/cellars", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storm: "Quiet storm" }),
  });
  await client.json("/api/cakes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cutterId: ids.rose, couple: "Margaret and Wei Chen", wedding: "Chen wedding", cutOn: "1978-06-10" }),
  });
  await client.json("/api/districts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, district: "District 4", startedOn: "1952-01-01", endedOn: "1958-12-31" }),
  });
  const crew = await client.json<{ crew: { id: string } }>("/api/butchering", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "North-farm hog day", heldOn: "1950-12-02" }),
  });
  await client.json("/api/butchering", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ crewId: crew.body.crew.id, personId: ids.louis, job: "stick" }),
  });
  await client.json("/api/recitals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june, piece: "Silent Night", kind: "recited", heldOn: "1992-12-20" }),
  });
  await client.json("/api/peddlers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ peddler: "Watkins", goods: "vanilla", buyerId: ids.rose, visitedOn: "1951-05-14" }),
  });
  await client.json("/api/strays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, animal: "a sow", postedOn: "1950-04-03" }),
  });
  await client.json("/api/shows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, item: "a tonic", show: "Cedar Falls medicine show", boughtOn: "1953-08-16" }),
  });
  await client.json("/api/molds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, mark: "H" }),
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
    ["/shelling", "[data-testid=shelling-roll]", "corn_shelling.png"],
    ["/teams", "[data-testid=teams-list]", "horse_team.png"],
    ["/smokehouse", "[data-testid=smokehouse-list]", "smokehouse.png"],
    ["/assessments", "[data-testid=assessments-roll]", "mutual_insurance.png"],
    ["/cellars", "[data-testid=cellars-roll]", "cyclone_cellar.png"],
    ["/cakes", "[data-testid=cakes-list]", "wedding_cake.png"],
    ["/districts", "[data-testid=districts-list]", "road_district.png"],
    ["/butchering", "[data-testid=butchering-roll]", "hog_crew.png"],
    ["/recitals", "[data-testid=recitals-list]", "christmas_program.png"],
    ["/peddlers", "[data-testid=peddlers-list]", "peddler_visit.png"],
    ["/strays", "[data-testid=strays-list]", "stray_animal.png"],
    ["/shows", "[data-testid=shows-list]", "medicine_show.png"],
    ["/molds", "[data-testid=molds-list]", "butter_mold.png"],
    ["/shelling/missing", "[data-testid=missing-shelling-heading]", "missing_shelling.png"],
    ["/cellars/missing", "[data-testid=missing-cellars-list]", "missing_cellars.png"],
  ];
  for (const [path, selector, name] of shots) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
    await page.waitForSelector(selector);
    await shot(name);
  }

  await browser.close();
  writeFileSync(`${MEDIA}/shelling_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui shelling layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
