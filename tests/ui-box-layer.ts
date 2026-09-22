import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-box");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker box" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
    { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
  ]) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  for (const rel of [
    { fromPersonId: ids.rose, toPersonId: ids.june, type: "parent" },
    { fromPersonId: ids.louis, toPersonId: ids.june, type: "parent" },
    { fromPersonId: ids.june, toPersonId: ids.maya, type: "parent" },
  ]) {
    await client.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rel),
    });
  }
  const rosePhoto = new FormData();
  rosePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
  rosePhoto.set("title", "Rose at the picnic");
  rosePhoto.set("personIds", ids.rose);
  await client.json("/api/assets", { method: "POST", body: rosePhoto });
  const loose = new FormData();
  loose.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "program.svg");
  loose.set("title", "Harvest program still in the box");
  const boxed = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: loose });
  ids.box = boxed.body.asset.id;
  const letter = new FormData();
  letter.set("title", "June to Maya about Rose");
  letter.set("transcript", "I found Rose's hatband letter in the upstairs hall.");
  letter.set("personIds", ids.rose);
  const savedLetter = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = savedLetter.body.document.id;
  await client.json(`/api/letters/${ids.letter}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lock: true }),
  });
  const heirloom = await client.json<{ heirloom: { id: string } }>("/api/heirlooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Ellie’s cedar chest", personId: ids.june, acquiredAt: "1948-06-14" }),
  });
  ids.chest = heirloom.body.heirloom.id;
  for (const hold of [
    { personId: ids.rose, heldFrom: "1948-06-14", heldUntil: "1995-09-01", note: "Ellie kept the letter in the tray." },
    { personId: ids.june, heldFrom: "1995-09-01", heldUntil: "2024-06-01", note: "June kept it in the hall." },
    { personId: ids.maya, heldFrom: "2024-06-01", note: "Maya has it for the reunion." },
  ]) {
    await client.json("/api/heirlooms/holds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heirloomId: ids.chest, ...hold }),
    });
  }
  const land = await client.json<{ record: { id: string } }>("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "land",
      personId: ids.louis,
      title: "North farm",
      place: "Cedar Falls, Iowa",
      acquiredOn: "1948-06-14",
      abstract: "The north forty stayed with the children after the 1948 deed.",
    }),
  });
  ids.land = land.body.record.id;
  const deed = new FormData();
  deed.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "deed.svg");
  deed.set("title", "North farm deed, 1948");
  const deedAsset = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: deed });
  await client.json("/api/land/deed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ landId: ids.land, assetId: deedAsset.body.asset.id }),
  });
  await client.json("/api/follows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, muted: true }),
  });
  await client.json("/api/meetings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Harvest planning at June's",
      happenedOn: "2026-03-20",
      notes: "Bring the cedar chest. File the leftover program onto June.",
      personIds: [ids.june, ids.maya],
    }),
  });
  await client.json("/api/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "What I still remember of Grandma's cider", body: "She said the cider was too sweet." }),
  });
  for (const home of [
    { personId: ids.rose, name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" },
    { personId: ids.june, name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" },
    { personId: ids.maya, name: "Iowa City", locality: "Iowa City", region: "Iowa" },
  ]) {
    await client.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...home, country: "United States" }),
    });
  }
  return { email, ids };
}

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const { email, ids } = await prepare();
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

  await page.goto(`${BASE}/box`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=box-heading]");
  await shot("unsorted_box.png");

  await page.goto(`${BASE}/heirlooms/${ids.chest}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=provenance-heading]");
  await shot("heirloom_provenance.png");

  await page.goto(`${BASE}/portraits`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=portraits-heading]");
  await shot("portrait_wall.png");

  await page.goto(`${BASE}/letters/${ids.letter}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=transcript-credit]");
  await shot("transcript_lock.png");

  await page.goto(`${BASE}/following`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=following-heading]");
  await shot("mute_follow.png");

  await page.goto(`${BASE}/land`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=deed-image]");
  await shot("deed_image.png");

  await page.goto(`${BASE}/living/pyramid`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=pyramid-heading]");
  await shot("age_pyramid.png");

  await page.goto(`${BASE}/meetings`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=meetings-heading]");
  await shot("family_meeting.png");

  await page.goto(`${BASE}/export/mine`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=mine-export-heading]");
  await shot("mine_export.png");

  await page.goto(`${BASE}/surnames/map`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=surname-map-heading]");
  await shot("surname_map.png");

  await page.goto(`${BASE}/portraits/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-portraits-heading]");
  await shot("missing_portraits.png");

  await page.goto(`${BASE}/letters/locked`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=locked-letters-heading]");
  await shot("locked_letters.png");

  await page.goto(`${BASE}/following/muted`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=muted-heading]");
  await shot("muted_follows.png");

  await page.goto(`${BASE}/land/deeds`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-deeds-heading]");
  await shot("missing_deeds.png");

  await page.goto(`${BASE}/letters/credits`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=credits-heading]");
  await shot("transcript_credits.png");

  await page.goto(`${BASE}/abstracts`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=deed-image]");
  await shot("abstract_deed.png");

  await page.goto(`${BASE}/heirlooms/chains`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=chains-heading]");
  await shot("provenance_chains.png");

  await browser.close();
  writeFileSync(`${MEDIA}/box_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui box layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
