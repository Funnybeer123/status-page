import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg, makeWav } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-packet");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker packet" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
    { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
    { key: "nora", displayName: "Nora Park", givenName: "Nora", familyName: "Park", birthDate: "2018-06-14" },
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
    { fromPersonId: ids.maya, toPersonId: ids.nora, type: "parent" },
  ]) {
    await client.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rel),
    });
  }
  const letter = new FormData();
  letter.set("title", "June to Helen, millinery counter");
  letter.set("kind", "letter");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", ids.rose);
  const saved = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = saved.body.document.id;
  const photo = new FormData();
  photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "counter.svg");
  photo.set("title", "Rose at the millinery counter");
  const asset = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
  ids.photo = asset.body.asset.id;
  await client.json("/api/assets/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.photo, personId: ids.rose, x: 42, y: 38 }),
  });
  await client.json(`/api/people/${ids.rose}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pronunciation: "rose WIT-uh-ker" }),
  });
  const recipe = await client.json<{ recipe: { id: string } }>("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Sunday rolls", body: "Warm milk and the navy-blue bowl.", personIds: [ids.rose] }),
  });
  ids.recipe = recipe.body.recipe.id;
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker reunion at Market Street",
      place: "Cedar Falls",
      happenedOn: "2026-07-04",
      personIds: [ids.helen],
    }),
  });
  ids.reunion = reunion.body.reunion.id;
  await client.json("/api/reunions/dishes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reunionId: ids.reunion,
      title: "Sunday rolls",
      personId: ids.helen,
      recipeId: ids.recipe,
    }),
  });
  const prompt = await client.json<{ prompt: { id: string } }>("/api/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "How did they keep Sunday dinner?" }),
  });
  const spoken = new FormData();
  spoken.set("promptId", prompt.body.prompt.id);
  spoken.set("body", "Helen kept the navy hatband in the cedar chest.");
  spoken.set("file", new Blob([makeWav()], { type: "audio/wav" }), "sunday.wav");
  await client.json("/api/prompts/answers", { method: "POST", body: spoken });
  await client.json("/api/citations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim: "Rose was born in Cedar Falls", personId: ids.rose, documentId: ids.letter, quality: "original" }),
  });
  const task = new FormData();
  task.set("title", "County register copy of Rose’s birth");
  task.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "register.svg");
  await client.json("/api/tasks", { method: "POST", body: task });
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

  await page.goto(`${BASE}/people/${member.ids.rose}/packet`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=packet-heading]");
  await shot("packet_preview.png");

  await page.goto(`${BASE}/children`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=children-heading]");
  await shot("packet_children.png");

  await page.goto(`${BASE}/prompts`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=prompts-heading]");
  await shot("packet_spoken_prompt.png");

  await page.goto(`${BASE}/reunions/${member.ids.reunion}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=potluck]");
  await shot("packet_potluck.png");

  await page.goto(`${BASE}/sources`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=sources-list]");
  await shot("packet_source_quality.png");

  await page.goto(`${BASE}/tasks`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=tasks-list]");
  await shot("packet_research_file.png");

  await page.goto(`${BASE}/people/${member.ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=person-pronunciation]");
  await shot("packet_pronunciation.png");

  await page.goto(`${BASE}/fan/print?personId=${member.ids.maya}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=fan-print]");
  await shot("packet_fan_print.png");

  await page.goto(`${BASE}/archive/${member.ids.photo}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=who-where]");
  await shot("packet_who_is_where.png");

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=this-week]");
  await shot("packet_this_week.png");

  await page.goto(`${BASE}/week`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=week-heading]");
  await shot("packet_week_page.png");

  await page.goto(`${BASE}/pronounce`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=pronounce-heading]");
  await shot("packet_pronounce.png");

  await page.goto(`${BASE}/spoken`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=spoken-heading]");
  await shot("packet_spoken_list.png");

  await page.goto(`${BASE}/packets`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=packets-heading]");
  await shot("packet_index.png");

  await page.goto(`${BASE}/quality`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=quality-heading]");
  await shot("packet_quality.png");

  await page.goto(`${BASE}/photos/unlocated`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=unlocated-heading]");
  await shot("packet_unlocated.png");

  await browser.close();
  writeFileSync(`${MEDIA}/packet_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui packet layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
