import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng, makePhotoSvg, makeWav } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-next");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker next" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
    { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
  ]) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  await client.json("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" }),
  });
  await client.json("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" }),
  });
  await client.json("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" }),
  });
  await client.json("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.louis,
      kind: "military",
      title: "Louis reported for the county draft board",
      happenedOn: "1944-09-22",
      name: "Cedar Falls",
      locality: "Cedar Falls",
      region: "Iowa",
    }),
  });
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      name: "Market Street rooms",
      locality: "Cedar Falls",
      region: "Iowa",
      startedAt: "1948-01-01",
    }),
  });
  const photo = new FormData();
  photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "market.svg");
  photo.set("title", "Market Street shop window");
  photo.set("capturedAt", "1952-06-14");
  photo.set("personIds", ids.rose);
  const uploaded = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
  const audio = new FormData();
  audio.set("file", new Blob([makeWav()], { type: "audio/wav" }), "helen.wav");
  audio.set("title", "Helen remembering the navy brim");
  audio.set("kind", "audio");
  audio.set("personIds", ids.helen);
  await client.json("/api/assets", { method: "POST", body: audio });
  const scan = makeLetterPng();
  const letter = new FormData();
  letter.set("file", new Blob([scan.bytes], { type: "image/png" }), "rose-letter.png");
  letter.set("title", "Aunt June on how Rose met Louis");
  letter.set("writtenAt", "1952-09-22");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", ids.rose);
  const saved = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  await client.json("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: saved.body.document.id, body: "I still have the navy hatband in the cedar chest." }),
  });
  const album = await client.json<{ album: { id: string } }>("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Market Street years", summary: "The shop and the letters." }),
  });
  await client.json(`/api/albums/${album.body.album.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: uploaded.body.asset.id }),
  });
  return { email, ids, letterId: saved.body.document.id, albumId: album.body.album.id };
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

  await page.waitForSelector("[data-testid=dashboard-heading]");
  await shot("next_dashboard.png");

  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=today-heading]");
  await shot("next_on_this_day.png");

  await page.goto(`${BASE}/activity`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=activity-heading]");
  await shot("next_activity.png");

  await page.goto(`${BASE}/map`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=map-heading]");
  await shot("next_map.png");

  await page.goto(`${BASE}/tree?view=pedigree&personId=${member.ids.helen}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=pedigree-chart]");
  await shot("next_pedigree.png");

  await page.goto(`${BASE}/book?personId=${member.ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=book-heading]");
  await shot("next_book.png");

  await page.goto(`${BASE}/albums/${member.albumId}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=album-title]");
  await shot("next_album.png");

  await page.goto(`${BASE}/letters/${member.letterId}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=comment-thread]");
  await shot("next_comments.png");

  await page.goto(`${BASE}/import`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=import-heading]");
  await shot("next_import.png");

  await page.goto(`${BASE}/export`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=export-heading]");
  await shot("next_export.png");

  await browser.close();
  writeFileSync(`${MEDIA}/next_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui next layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
