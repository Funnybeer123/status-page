import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-memorial");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker memorial" });
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
  const savedRose = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: rosePhoto });
  ids.rosePhoto = savedRose.body.asset.id;
  await client.json("/api/portraits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, assetId: ids.rosePhoto }),
  });
  const junePhoto = new FormData();
  junePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "june.svg");
  junePhoto.set("title", "June at the counter");
  junePhoto.set("personIds", ids.june);
  const savedJune = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: junePhoto });
  await client.json("/api/portraits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june, assetId: savedJune.body.asset.id }),
  });
  const original = new FormData();
  original.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "scan.svg");
  original.set("title", "Faded picnic scan");
  original.set("personIds", ids.rose);
  const savedOriginal = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: original });
  const cleaned = new FormData();
  cleaned.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "cleaned.svg");
  cleaned.set("title", "Picnic scan cleaned");
  cleaned.set("personIds", ids.rose);
  const savedCleaned = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: cleaned });
  const restore = await client.json<{ restore: { id: string } }>("/api/restores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Rose picnic",
      originalId: savedOriginal.body.asset.id,
      cleanedId: savedCleaned.body.asset.id,
      notes: "Lily cleaned the cottonwoods.",
    }),
  });
  ids.restore = restore.body.restore.id;
  for (const title of ["Harvest program still in the box", "Prize ribbon still in the box"]) {
    const loose = new FormData();
    loose.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "loose.svg");
    loose.set("title", title);
    await client.json("/api/assets", { method: "POST", body: loose });
  }
  const letter = new FormData();
  letter.set("title", "June to Maya about Rose");
  letter.set("transcript", "I found Rose's first hatband note.");
  letter.set("personIds", ids.rose);
  const savedLetter = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = savedLetter.body.document.id;
  await client.json(`/api/letters/${ids.letter}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: "I found Rose's hatband letter in the upstairs hall." }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "occupation",
      personId: ids.rose,
      title: "Milliner",
      employer: "Market Street",
      place: "Cedar Falls",
      startedOn: "1946-03-01",
      endedOn: "1952-06-01",
    }),
  });
  await client.json("/api/schools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      school: "Cedar Falls High",
      place: "Cedar Falls, Iowa",
      startedOn: "1941-09-02",
      endedOn: "1945-05-28",
    }),
  });
  const prompt = await client.json<{ prompt: { id: string } }>("/api/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "How did Rose keep Sunday dinner?", body: "Tell it the way June told it." }),
  });
  ids.prompt = prompt.body.prompt.id;
  await client.json("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Sunday rolls from Maya",
      body: "Rose kept the navy hatband on the sideboard.",
      recordedAt: "2026-03-12",
      personIds: [ids.rose],
    }),
  });
  await client.json("/api/style", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nameStyle: "given-family", dateStyle: "day-month-year" }),
  });
  await client.html(`/people/${ids.rose}`);
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

  await page.goto(`${BASE}/portraits/memorial`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=memorial-wall-heading]");
  await shot("memorial_wall.png");

  await page.goto(`${BASE}/letters/${ids.letter}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=transcript-compare]");
  await shot("transcript_compare.png");

  await page.goto(`${BASE}/people/${ids.rose}/occupations`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=occupation-timeline-heading]");
  await shot("occupation_timeline.png");

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-today-question]");
  await shot("today_question.png");

  await page.waitForSelector("[data-testid=home-recents]");
  await shot("recently_opened.png");

  await page.goto(`${BASE}/schools/map`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=school-map-heading]");
  await shot("school_map.png");

  await page.goto(`${BASE}/box`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=file-many-form]");
  await shot("file_many.png");

  await page.goto(`${BASE}/style`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=style-heading]");
  await shot("style_sheet.png");

  await page.goto(`${BASE}/year?year=2026`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=this-year-heading]");
  await shot("year_credits.png");

  await page.goto(`${BASE}/restores/${ids.restore}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=restore-pair]");
  await shot("restoration_pair.png");

  await page.goto(`${BASE}/portraits/living`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=living-wall-heading]");
  await shot("living_wall.png");

  await page.goto(`${BASE}/letters/edited`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=edited-letters-heading]");
  await shot("edited_letters.png");

  await page.goto(`${BASE}/prompts/unanswered`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=unanswered-heading]");
  await shot("unanswered_questions.png");

  await page.goto(`${BASE}/recents`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=recents-heading]");
  await shot("recently_opened_list.png");

  await page.goto(`${BASE}/occupations/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-occupations-heading]");
  await shot("missing_occupations.png");

  await page.goto(`${BASE}/letters/${ids.letter}/compare`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=transcript-compare-heading]");
  await shot("transcript_versions.png");

  await browser.close();
  writeFileSync(`${MEDIA}/memorial_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui memorial layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
