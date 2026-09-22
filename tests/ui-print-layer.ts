import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-print");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker print" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
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
  const wedding = await client.json<{ event: { id: string } }>("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      otherPersonId: ids.louis,
      kind: "marriage",
      title: "Rose and Louis married",
      happenedOn: "1953-05-01",
      name: "St. John's",
    }),
  });
  ids.wedding = wedding.body.event.id;
  const letter = new FormData();
  letter.set("title", "June to Helen, millinery counter");
  letter.set("kind", "letter");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", `${ids.rose},${ids.louis}`);
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
    body: JSON.stringify({ assetId: ids.photo, personId: ids.rose }),
  });
  const later = new FormData();
  later.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "later.svg");
  later.set("title", "Market Street today");
  const laterAsset = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: later });
  ids.laterPhoto = laterAsset.body.asset.id;
  const heirloom = await client.json<{ heirloom: { id: string } }>("/api/heirlooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Navy hatband", personId: ids.rose, acquiredAt: "1952-06-14" }),
  });
  await client.json("/api/loans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      heirloomId: heirloom.body.heirloom.id,
      borrowerId: ids.maya,
      borrowedOn: "2026-06-01",
      dueOn: "2026-10-12",
      notes: "For the reunion table.",
    }),
  });
  const home = await client.json<{ home: { id: string } }>("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker house",
      line: "14 Market Street",
      locality: "Cedar Falls",
      personIds: [ids.rose, ids.louis],
    }),
  });
  ids.home = home.body.home.id;
  await client.json("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ homeId: ids.home, assetId: ids.photo, takenOn: "1952-06-14", caption: "The counter year" }),
  });
  await client.json("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ homeId: ids.home, assetId: ids.laterPhoto, takenOn: "2024-06-14", caption: "The same doors" }),
  });
  await client.json("/api/digitize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Ruth’s reply, still in the cedar chest", kind: "letter", holderId: ids.maya }),
  });
  await client.json("/api/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "The millinery letter", note: "How Grandma met Grandpa.", documentId: ids.letter }),
  });
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker cousins at the Grange",
      place: "Grange hall",
      happenedOn: "2026-07-04",
      personIds: [ids.maya, ids.helen],
    }),
  });
  ids.reunion = reunion.body.reunion.id;
  await client.json("/api/reunions/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reunionId: ids.reunion, assetId: ids.photo }),
  });
  await client.json("/api/handwriting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, documentId: ids.letter, notes: "The long loops on millinery." }),
  });
  await client.json("/api/later-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "inscription", personId: ids.rose, text: "At rest under the cottonwoods", place: "Fairview Cemetery" }),
  });
  await client.json("/api/later-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "holiday", title: "Harvest-dance anniversary supper", season: "October" }),
  });
  await client.json(`/api/people/${ids.rose}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ causeOfDeath: "In her sleep at home", burialPlot: "Fairview, lot 14" }),
  });
  await client.json("/api/names", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, kind: "nickname", name: "Rosie" }),
  });
  await client.json("/api/witnesses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId: ids.wedding, personId: ids.helen, role: "witness" }),
  });
  const oral = new FormData();
  oral.set("file", new Blob(["oral history placeholder"], { type: "audio/mpeg" }), "helen.mp3");
  oral.set("title", "Helen on the millinery counter");
  oral.set("kind", "audio");
  await client.json("/api/assets", { method: "POST", body: oral });
  await client.json("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: ids.letter, body: "@Maya, the millinery letter is still in the drawer." }),
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

  await page.goto(`${BASE}/group-sheets/${member.ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=group-sheet]");
  await shot("print_group_sheet.png");

  await page.goto(`${BASE}/people/${member.ids.rose}/report`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=descendant-report]");
  await shot("print_descendant_report.png");

  await page.goto(`${BASE}/ask/grandchild`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=grandchild-ask-heading]");
  await page.click("[data-testid=ask-submit]");
  await page.waitForSelector("[data-testid=ask-assistant]");
  await shot("print_grandchild_ask.png");

  await page.goto(`${BASE}/loans`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=loans-heading]");
  await shot("print_loans.png");

  await page.goto(`${BASE}/homes/${member.ids.home}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-title]");
  await shot("print_home.png");

  await page.goto(`${BASE}/digitize`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=digitize-heading]");
  await shot("print_digitize.png");

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-pins]");
  await shot("print_pins.png");

  await page.goto(`${BASE}/letters/${member.ids.letter}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=comment-thread]");
  await shot("print_mentions.png");

  await page.goto(`${BASE}/reunions/${member.ids.reunion}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=reunion-gallery]");
  await shot("print_reunion_gallery.png");

  await page.goto(`${BASE}/handwriting`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=handwriting-heading]");
  await shot("print_handwriting.png");

  await page.goto(`${BASE}/inscriptions`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=inscriptions-heading]");
  await shot("print_inscriptions.png");

  await page.goto(`${BASE}/holidays`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=holidays-heading]");
  await shot("print_holidays.png");

  await page.goto(`${BASE}/marriages`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=marriages-heading]");
  await shot("print_marriages.png");

  await page.goto(`${BASE}/correspondents`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=correspondents-heading]");
  await shot("print_correspondents.png");

  await page.goto(`${BASE}/deaths`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=deaths-heading]");
  await shot("print_deaths.png");

  await page.goto(`${BASE}/nicknames`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=nicknames-heading]");
  await shot("print_nicknames.png");

  await page.goto(`${BASE}/firsts`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=firsts-heading]");
  await shot("print_firsts.png");

  await browser.close();
  writeFileSync(`${MEDIA}/print_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui print layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
