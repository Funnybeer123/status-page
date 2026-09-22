import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-quilting");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker quilting" });
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
  const bee = await client.json<{ bee: { id: string } }>("/api/bees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Harvest ring bee", heldOn: "1952-04-12" }),
  });
  await client.json("/api/bees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beeId: bee.body.bee.id, personId: ids.rose, block: "Ohio star" }),
  });
  await client.json("/api/bees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beeId: bee.body.bee.id, personId: ids.june, block: "nine-patch" }),
  });
  await client.json("/api/bees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Lonely winter bee" }),
  });
  await client.json("/api/bells", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, service: "Sunday morning", rangOn: "1948-06-14" }),
  });
  await client.json("/api/socials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buyerId: ids.ned, sellerId: ids.june, heldOn: "1968-10-12", price: "35 cents" }),
  });
  const route = await client.json<{ route: { id: string } }>("/api/mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Rural Route 2", days: "Tue Thu Sat", carrierId: ids.louis }),
  });
  await client.json("/api/mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routeId: route.body.route.id, personId: ids.rose, boxNumber: "14" }),
  });
  await client.json("/api/wash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, weekday: "Monday" }),
  });
  await client.json("/api/seeds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.louis,
      variety: "Early Ohio potatoes",
      quantity: "2 sacks",
      supplier: "Iowa Seed Co.",
      year: 1952,
    }),
  });
  const barn = await client.json<{ barn: { id: string } }>("/api/barns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "North-farm barn", heldOn: "1949-06-18" }),
  });
  await client.json("/api/barns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raisingId: barn.body.barn.id, personId: ids.louis, job: "frame" }),
  });
  await client.json("/api/barns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raisingId: barn.body.barn.id, personId: ids.ned, job: "peg" }),
  });
  const confirm = await client.json<{ class: { id: string } }>("/api/confirmations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ church: "St. John's", year: 1945 }),
  });
  await client.json("/api/confirmations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classId: confirm.body.class.id, personId: ids.rose }),
  });
  await client.json("/api/confirmations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ church: "St. John's", year: 1946 }),
  });
  await client.json("/api/watches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deceasedId: ids.rose, personId: ids.june, watchedOn: "2008-11-01" }),
  });
  await client.json("/api/butter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, store: "Market Street", account: "Whitaker 3", year: 1961 }),
  });
  await client.json("/api/wells", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, place: "north farm", depth: "42 feet", year: 1949 }),
  });
  await client.json("/api/organs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, title: "cottage organ", place: "north-farm parlor" }),
  });
  await client.json("/api/sunday-pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june, year: 1996, church: "St. John's" }),
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

  await page.goto(`${BASE}/bees`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=bees-list]");
  await shot("quilting_bee.png");

  await page.goto(`${BASE}/bells`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=bells-list]");
  await shot("church_bell.png");

  await page.goto(`${BASE}/socials`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=socials-list]");
  await shot("box_social.png");

  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=mail-list]");
  await shot("rural_mail.png");

  await page.goto(`${BASE}/wash`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=wash-list]");
  await shot("wash_day.png");

  await page.goto(`${BASE}/seeds`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=seeds-list]");
  await shot("seed_order.png");

  await page.goto(`${BASE}/barns`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=barn-crew]");
  await shot("barn_raising.png");

  await page.goto(`${BASE}/confirmations`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=confirmation-roll]");
  await shot("confirmation_class.png");

  await page.goto(`${BASE}/watches`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=watches-list]");
  await shot("deathwatch.png");

  await page.goto(`${BASE}/butter`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=butter-list]");
  await shot("butter_egg.png");

  await page.goto(`${BASE}/wells`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=wells-list]");
  await shot("well_depth.png");

  await page.goto(`${BASE}/organs`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=organs-list]");
  await shot("parlor_organ.png");

  await page.goto(`${BASE}/pins`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=pins-list]");
  await shot("sunday_school_pin.png");

  await page.goto(`${BASE}/bees/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-bees-heading]");
  await shot("missing_bees.png");

  await page.goto(`${BASE}/confirmations/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-confirmations-list]");
  await shot("missing_confirmations.png");

  await browser.close();
  writeFileSync(`${MEDIA}/quilting_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui quilting layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
