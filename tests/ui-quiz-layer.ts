import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg, makeWav } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-quiz");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker quiz" });
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
  await client.json("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      otherPersonId: ids.louis,
      kind: "marriage",
      title: "Rose and Louis married",
      happenedOn: "1953-09-22",
      name: "St. John's",
    }),
  });
  const letter = new FormData();
  letter.set("title", "June to Helen, millinery counter");
  letter.set("kind", "letter");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", `${ids.rose},${ids.louis}`);
  const saved = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = saved.body.document.id;
  const reply = new FormData();
  reply.set("title", "Helen’s reply about the hatband");
  reply.set("kind", "letter");
  reply.set("writtenAt", "1952-07-01");
  reply.set("transcript", "Helen kept the navy hatband in the cedar chest.");
  reply.set("personIds", ids.rose);
  reply.set("replyToId", ids.letter);
  const answered = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: reply });
  ids.reply = answered.body.document.id;
  const photo = new FormData();
  photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "counter.svg");
  photo.set("title", "Rose at the millinery counter");
  const asset = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
  ids.photo = asset.body.asset.id;
  await client.json("/api/assets/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.photo, personId: ids.rose }),
  });
  await client.json("/api/photos/place", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.photo, name: "Grange hall", locality: "Cedar Falls", region: "Iowa" }),
  });
  const oral = new FormData();
  oral.set("file", new Blob([makeWav()], { type: "audio/wav" }), "helen.wav");
  oral.set("title", "Helen on the picnic reel");
  oral.set("kind", "audio");
  const reel = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: oral });
  ids.oral = reel.body.asset.id;
  await client.json("/api/oral/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assetId: ids.oral,
      personId: ids.rose,
      title: "Picnic reel, Helen speaking",
      transcript: "Helen speaking over the picnic reel. Mother is cutting Sunday rolls under the cottonwoods.",
    }),
  });
  await client.json("/api/worksheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "census", personId: ids.rose, year: "1950", place: "Cedar Falls", detail: "ED 7-12", documentId: ids.letter }),
  });
  await client.json("/api/worksheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "birth", personId: ids.rose, year: "1929-03-08", place: "Cedar Falls", documentId: ids.letter }),
  });
  await client.json("/api/worksheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "death", personId: ids.rose, year: "2008-11-02", place: "Cedar Falls", documentId: ids.letter }),
  });
  await client.json("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, body: "I still think of Rose when the millinery letter comes out of the drawer." }),
  });
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker cousins at the Grange",
      place: "Grange hall",
      happenedOn: "2026-09-22",
      personIds: [ids.maya, ids.helen],
    }),
  });
  ids.reunion = reunion.body.reunion.id;
  await client.json("/api/reunions/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reunionId: ids.reunion, assetId: ids.photo }),
  });
  await client.json("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.louis,
      kind: "residence",
      title: "Louis at the other Grange Hall",
      happenedOn: "1948-01-01",
      name: "Grange Hall",
      locality: "Cedar Falls",
    }),
  });
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

  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=quiz-heading]");
  await page.click("[data-testid=quiz-reveal]");
  await page.waitForSelector("[data-testid=quiz-answer]");
  await shot("quiz_grandchild.png");

  await page.goto(`${BASE}/oral`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=oral-heading]");
  await shot("quiz_oral_transcript.png");

  await page.goto(`${BASE}/map/photos`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=photo-map-heading]");
  await shot("quiz_photo_map.png");

  await page.goto(`${BASE}/letters/${member.ids.reply}/room`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=reading-room]");
  await shot("quiz_reading_room.png");

  await page.goto(`${BASE}/places`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=place-merge-form]");
  await shot("quiz_place_merge.png");

  await page.goto(`${BASE}/worksheets`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=worksheets-list]");
  await shot("quiz_worksheets.png");

  await page.goto(`${BASE}/people/${member.ids.rose}/memorial`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=memorial-guestbook]");
  await shot("quiz_guestbook.png");

  await page.goto(`${BASE}/newsletter`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=newsletter-heading]");
  await shot("quiz_newsletter.png");

  await page.goto(`${BASE}/tree?view=pedigree&personId=${member.ids.maya}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=ahnentafel-number]");
  await shot("quiz_ahnentafel.png");

  await page.goto(`${BASE}/reunions/${member.ids.reunion}/kiosk`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=reunion-kiosk]");
  await shot("quiz_reunion_kiosk.png");

  await page.goto(`${BASE}/to-interview`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=to-interview-heading]");
  await shot("quiz_to_interview.png");

  await page.goto(`${BASE}/ages`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=ages-heading]");
  await shot("quiz_ages.png");

  await page.goto(`${BASE}/this-month`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=this-month-heading]");
  await shot("quiz_this_month.png");

  await page.goto(`${BASE}/inventory`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=inventory-heading]");
  await shot("quiz_inventory.png");

  await page.goto(`${BASE}/uncited`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=uncited-heading]");
  await shot("quiz_uncited.png");

  await page.goto(`${BASE}/quotes`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=quotes-heading]");
  await shot("quiz_quotes.png");

  await browser.close();
  writeFileSync(`${MEDIA}/quiz_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui quiz layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
