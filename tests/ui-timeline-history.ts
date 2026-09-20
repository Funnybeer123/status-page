import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng, makePhotoSvg, makeVideo } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepareHistoryFamily() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-history");
  await client.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker history",
  });
  await client.signIn(email, PASSWORD);

  const peopleSpec = [
    { key: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
    { key: "helen", displayName: "Helen Park", birthDate: "1954-09-19" },
    { key: "nora", displayName: "Nora Park", birthDate: "1983-01-30" },
    { key: "ada", displayName: "Ada Cousin" },
  ];
  const ids: Record<string, string> = {};
  for (const person of peopleSpec) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  for (const link of [
    { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" },
    { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
    { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
    { fromPersonId: ids.helen, toPersonId: ids.nora, type: "parent" },
    { fromPersonId: ids.ada, toPersonId: ids.helen, type: "partner" },
  ]) {
    await client.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(link),
    });
  }

  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      name: "Market Street rooms",
      startedAt: "1948-01-01",
      endedAt: "1954-09-01",
    }),
  });

  const photo = new FormData();
  photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "market.svg");
  photo.set("title", "Market Street shop window");
  photo.set("capturedAt", "1952-06-14");
  photo.set("personIds", `${ids.rose},${ids.louis}`);
  await client.json("/api/assets", { method: "POST", body: photo });

  const video = makeVideo();
  const reel = new FormData();
  reel.set("file", new Blob([video.bytes], { type: "video/mp4" }), "reunion.mp4");
  reel.set("title", "Family reunion reel");
  reel.set("capturedAt", "1964-07-04");
  reel.set("kind", "video");
  reel.set("personIds", ids.helen);
  await client.json("/api/assets", { method: "POST", body: reel });

  const scan = makeLetterPng();
  const letter = new FormData();
  letter.set("file", new Blob([scan.bytes], { type: "image/png" }), "rose-letter.png");
  letter.set("title", "Aunt June on how Rose met Louis");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", `${ids.rose},${ids.louis}`);
  await client.json("/api/letters", { method: "POST", body: letter });

  await client.json("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "The felted navy brim",
      body: "Rose always kept the felted navy brim on a wooden block above the counter.",
      recordedAt: "2014-04-20",
      tellerPersonId: ids.helen,
      personIds: [ids.rose, ids.helen],
    }),
  });

  await client.json("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      kind: "other",
      title: "War-time millinery night shift",
      happenedOn: "1943-11-11",
    }),
  });

  return { email, ids };
}

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const member = await prepareHistoryFamily();
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

  await page.goto(`${BASE}/timeline`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=timeline-heading]");
  const body = await page.evaluate(() => document.body.innerText);
  if (!body.includes("Family history") || !body.includes("unrecorded years") || !body.includes("War-time millinery night shift")) {
    throw new Error("history page is missing the full timeline, a gap, or the added event");
  }
  if (!body.includes("Market Street shop window") || !body.includes("Family reunion reel") || !body.includes("felted navy brim")) {
    throw new Error("history page is missing photo, film, or story");
  }
  await shot("history_timeline.png");

  await page.goto(`${BASE}/timeline?generation=0`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=timeline-gen-0]");
  const genText = await page.evaluate(() => document.body.innerText);
  if (!genText.includes("Rose Whitaker") || genText.includes("Family reunion reel")) {
    throw new Error("generation filter should keep the first generation and drop Helen's reel");
  }
  await shot("history_timeline_generation.png");

  await page.goto(`${BASE}/timeline?personId=${member.ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/Rose Whitaker");
  const roseText = await page.evaluate(() => document.body.innerText);
  if (!roseText.includes("night shift") || roseText.includes("Family reunion reel")) {
    throw new Error("person filter should keep Rose and drop Helen's reel");
  }
  await shot("history_timeline_person.png");

  await page.goto(`${BASE}/timeline#add-event`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=timeline-add-event]");
  await page.evaluate(() => document.getElementById("add-event")?.scrollIntoView());
  await shot("history_timeline_add.png");

  await browser.close();
  writeFileSync(`${MEDIA}/history_timeline_manifest.txt`, written.join("\n") + "\n");
  console.log("ui timeline history ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
