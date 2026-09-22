import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makeLetterPng, makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-ship");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker keep" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    { key: "dup", displayName: "Rose W.", givenName: "Rose", birthDate: "1929-03-08" },
    { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
  ]) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  await client.json("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, kind: "religion", title: "Rose confirmed at St. John's", happenedOn: "1941-04-13" }),
  });
  await client.json("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, kind: "burial", title: "Rose buried at Fairview", happenedOn: "2008-11-05" }),
  });
  const scan = makeLetterPng();
  const clipping = new FormData();
  clipping.set("file", new Blob([scan.bytes], { type: "image/png" }), "gazette.png");
  clipping.set("title", "Millinery counter notice");
  clipping.set("writtenAt", "1952-06-20");
  clipping.set("transcript", "Rose Whitaker of Market Street fitted the navy brim.");
  clipping.set("personIds", ids.rose);
  await client.json("/api/clippings", { method: "POST", body: clipping });
  await client.json("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Rose’s Sunday rolls",
      body: "Warm milk, a cake of yeast, and the navy-blue bowl.",
      personIds: [ids.rose],
    }),
  });
  await client.json("/api/heirlooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "The navy hatband", personId: ids.rose }),
  });
  const bulk = new FormData();
  bulk.append("files", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "one.svg");
  bulk.append("files", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "two.svg");
  await client.json("/api/assets/bulk", { method: "POST", body: bulk });
  return { email, ids };
}

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const member = await prepare();
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const written: string[] = [];

  async function shot(name: string) {
    await page.waitForNetworkIdle({ idleTime: 400, timeout: 15000 }).catch(() => undefined);
    const path = `${MEDIA}/${name}`;
    await page.screenshot({ path, fullPage: true });
    const size = statSync(path).size;
    if (size < 10_000) throw new Error(`${path} is too small (${size})`);
    written.push(path);
    console.log("wrote", path, size);
  }

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await page.type("input[type=email]", member.email);
  await page.type("input[type=password]", PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click("[data-testid=login-submit]"),
  ]);

  await page.goto(`${BASE}/duplicates`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=duplicates-heading]");
  await shot("ship_duplicates.png");

  await page.goto(`${BASE}/people/${member.ids.rose}/memorial`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=memorial-heading]");
  await shot("ship_memorial.png");

  await page.goto(`${BASE}/dates`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=ics-download]");
  await shot("ship_calendar.png");

  await page.goto(`${BASE}/archive`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=bulk-photo-form]");
  await shot("ship_bulk.png");

  await page.goto(`${BASE}/clippings`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=clippings-heading]");
  await shot("ship_clippings.png");

  await page.goto(`${BASE}/recipes`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=recipes-heading]");
  await shot("ship_cookbook.png");

  await page.goto(`${BASE}/stats`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=stats-heading]");
  await shot("ship_stats.png");

  await page.goto(`${BASE}/import`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=restore-form]");
  await shot("ship_restore.png");

  await page.goto(`${BASE}/heirlooms`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=heirlooms-heading]");
  await shot("ship_heirlooms.png");

  await page.goto(`${BASE}/research`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=research-heading]");
  await shot("ship_research.png");

  await page.goto(`${BASE}/notifications`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=notifications-heading]");
  await shot("ship_notifications.png");

  await browser.close();
  writeFileSync(`${MEDIA}/keep_shipping_manifest.txt`, written.join("\n") + "\n");
  console.log("ui keep shipping ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
