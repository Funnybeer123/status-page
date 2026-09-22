import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-capsule");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker capsule" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
    { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
  ]) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  const sealed = await client.json<{ capsule: { id: string } }>("/api/capsules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Rose’s letter for Maya, to open in 2047",
      body: "Maya, if you still keep the navy hatband, remember the millinery counter.",
      writtenAt: "1952-06-14",
      openOn: "2047-06-14",
      addresseeName: "Maya Park",
      addresseePersonId: ids.maya,
      fromPersonId: ids.rose,
    }),
  });
  ids.capsule = sealed.body.capsule.id;
  await client.json("/api/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      promptKey: "meet",
      body: "I met Louis at the millinery counter. He bought a navy hatband.",
    }),
  });
  await client.json(`/api/people/${ids.rose}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "Rose Whitaker Park", deathDate: "2008-11-03" }),
  });
  await client.json("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1952-06-14" }),
  });
  const branch = await client.json<{ branch: { id: string } }>("/api/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "the Cedar Falls Harts",
      summary: "The Iowa line",
      personIds: [ids.rose, ids.louis],
    }),
  });
  ids.branch = branch.body.branch.id;
  const cemetery = await client.json<{ cemetery: { id: string } }>("/api/cemeteries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Fairview Cemetery", locality: "Cedar Falls", region: "Iowa" }),
  });
  ids.cemetery = cemetery.body.cemetery.id;
  await client.json("/api/cemeteries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cemeteryId: ids.cemetery, personId: ids.rose, plot: "Lot 14" }),
  });
  const thenPhoto = new FormData();
  thenPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "then.svg");
  thenPhoto.set("title", "Market Street, 1952");
  const then = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: thenPhoto });
  const nowPhoto = new FormData();
  nowPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "now.svg");
  nowPhoto.set("title", "Market Street today");
  const now = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: nowPhoto });
  await client.json("/api/pairs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Market Street, then and now",
      thenAssetId: then.body.asset.id,
      nowAssetId: now.body.asset.id,
    }),
  });
  await client.json("/api/citations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim: "They met at the millinery counter.", personId: ids.rose }),
  });
  await client.json("/api/voyages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ship: "SS Eastern Star",
      departedFrom: "Hong Kong",
      arrivedAt: "San Francisco",
      departedOn: "1972-03-04",
      personIds: [ids.louis],
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
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker reunion",
      place: "Market Street",
      happenedOn: "2026-07-04",
      personIds: [ids.maya, ids.rose],
    }),
  });
  ids.reunion = reunion.body.reunion.id;
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "occupation", personId: ids.louis, title: "Milliner", place: "Market Street" }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "godparent", childId: ids.maya, godparentId: ids.rose }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "congregation", personId: ids.rose, name: "St. John's", place: "Cedar Falls" }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "land", personId: ids.louis, title: "North farm", place: "Cedar Falls, Iowa" }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "military", personId: ids.louis, branch: "Army" }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "bible", title: "Whitaker Bible", holderId: ids.rose, body: "Married at St. John's." }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "motto", text: "Courtesy to the trees" }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "passport", personId: ids.louis, place: "Hong Kong" }),
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

  await page.goto(`${BASE}/capsules`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=capsules-heading]");
  await shot("capsule_letters.png");

  await page.goto(`${BASE}/capsules/${member.ids.capsule}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=capsule-title]");
  await shot("capsule_letter.png");

  await page.goto(`${BASE}/interviews?personId=${member.ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=interviews-heading]");
  await shot("capsule_interview.png");

  await page.goto(`${BASE}/people/${member.ids.rose}/history`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=history-heading]");
  await shot("capsule_history.png");

  await page.goto(`${BASE}/tree?branchId=${member.ids.branch}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=tree-heading]");
  await shot("capsule_branch_tree.png");

  await page.goto(`${BASE}/timeline?branchId=${member.ids.branch}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=timeline-heading]");
  await shot("capsule_branch_timeline.png");

  await page.goto(`${BASE}/cemeteries/${member.ids.cemetery}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=cemetery-name]");
  await shot("capsule_cemetery.png");

  await page.goto(`${BASE}/pairs`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=pairs-heading]");
  await shot("capsule_pairs.png");

  await page.goto(`${BASE}/bibliography`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=bibliography-heading]");
  await shot("capsule_bibliography.png");

  await page.goto(`${BASE}/voyages`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=voyages-heading]");
  await shot("capsule_voyages.png");

  await page.goto(`${BASE}/schools`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=schools-heading]");
  await shot("capsule_schools.png");

  await page.goto(`${BASE}/reunions/${member.ids.reunion}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=reunion-title]");
  await shot("capsule_reunion.png");

  await page.goto(`${BASE}/occupations`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=occupations-heading]");
  await shot("capsule_occupations.png");

  await page.goto(`${BASE}/godparents`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=godparents-heading]");
  await shot("capsule_godparents.png");

  await page.goto(`${BASE}/congregations`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=congregations-heading]");
  await shot("capsule_congregations.png");

  await page.goto(`${BASE}/land`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=land-heading]");
  await shot("capsule_land.png");

  await page.goto(`${BASE}/military`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=military-heading]");
  await shot("capsule_military.png");

  await page.goto(`${BASE}/bibles`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=bibles-heading]");
  await shot("capsule_bibles.png");

  await page.goto(`${BASE}/mottos`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=mottos-heading]");
  await shot("capsule_mottos.png");

  await page.goto(`${BASE}/passports`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=passports-heading]");
  await shot("capsule_passports.png");

  await browser.close();
  writeFileSync(`${MEDIA}/capsule_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui capsule layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
