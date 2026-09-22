import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-funeral");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker funeral" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F", notes: "Kept the hatband note in the upstairs hall." },
    { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "ada", displayName: "Ada Whitaker", givenName: "Ada", familyName: "Whitaker", birthDate: "1901-02-02", deathDate: "1982-05-09" },
    { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
    { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
  ]) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  const place = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Cedar Falls",
      locality: "Cedar Falls",
      region: "Iowa",
      gps: "42.5278 N, 92.4453 W",
    }),
  });
  ids.place = place.body.place.id;
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, placeId: ids.place, startedAt: "1948-06-14", endedAt: "2008-11-02" }),
  });
  await client.json("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Quiet creek" }),
  });
  const first = new FormData();
  first.set("title", "June to Maya about Rose");
  first.set("writtenAt", "1952-06-14");
  first.set("transcript", "I found Rose's first hatband note in the upstairs hall.\n\nKeep it with the cedar chest.");
  first.set("personIds", ids.rose);
  const savedFirst = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
  ids.letter = savedFirst.body.document.id;
  const second = new FormData();
  second.set("title", "Rose to June about the picnic");
  second.set("writtenAt", "1961-07-05");
  second.set("transcript", "The cottonwoods held the picnic baskets and Louis carved the watermelon.");
  second.set("personIds", ids.rose);
  await client.json("/api/letters", { method: "POST", body: second });
  const portrait = new FormData();
  portrait.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
  portrait.set("title", "Rose Whitaker, about 1948");
  portrait.set("capturedAt", "1948-06-14T14:00:00Z");
  portrait.set("personIds", ids.rose);
  await client.json("/api/assets", { method: "POST", body: portrait });
  await client.json("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Cottonwoods this summer",
      body: "June said the cottonwoods still hold the walk home.",
      tellerPersonId: ids.june,
      personIds: [ids.rose],
    }),
  });
  const hunt = await client.json<{ hunt: { id: string } }>("/api/hunts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Harvest scavenger hunt" }),
  });
  ids.hunt = hunt.body.hunt.id;
  await client.json("/api/hunts/clues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      huntId: ids.hunt,
      clue: "Look for the hatband note.",
      targetKind: "letter",
      answer: "June to Maya about Rose",
      documentId: ids.letter,
    }),
  });
  await client.json(`/api/hunts/${ids.hunt}/finish`, { method: "POST" });
  await client.json("/api/hunts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Winter attic hunt" }),
  });
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Hart reunion at the north farm",
      place: "North farm, Cedar Falls",
      happenedOn: "2026-07-04",
      personIds: [ids.maya, ids.june],
    }),
  });
  ids.reunion = reunion.body.reunion.id;
  await client.json(`/api/reunions/${ids.reunion}/seats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.maya, tableName: "Cottonwood table", seat: 1 }),
  });
  await client.json(`/api/reunions/${ids.reunion}/seats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june, tableName: "Cottonwood table", seat: 2 }),
  });
  await client.json("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Winter gathering", place: "Cedar Falls", happenedOn: "2026-12-24" }),
  });
  await client.json("/api/names", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      kind: "nickname",
      name: "Rosie",
      notes: "What June still calls her when she opens the cedar chest.",
    }),
  });
  await client.json("/api/names", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june, kind: "nickname", name: "Junie" }),
  });
  await client.json("/api/life-drafts/fill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose }),
  });
  await client.json("/api/since-visit", { method: "POST" });
  await client.json("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Sunday rolls after the visit", body: "Maya wrote this after marking the visit." }),
  });
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

  await page.goto(`${BASE}/people/${ids.rose}/funeral`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=funeral-program]");
  await shot("funeral_program.png");

  await page.goto(`${BASE}/letters/pair?personId=${ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=letter-pair-heading]");
  await shot("letter_pair.png");

  await page.goto(`${BASE}/atlas`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=atlas-list]");
  await shot("family_atlas.png");

  await page.goto(`${BASE}/hunts/badges`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=hunt-badges]");
  await shot("hunt_badge.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/seating`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=seating-chart]");
  await shot("seating_chart.png");

  await page.goto(`${BASE}/since`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=since-visit-list]");
  await shot("since_last_visit.png");

  await page.goto(`${BASE}/archive/uploaders`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=uploaders-list]");
  await shot("archive_uploaders.png");

  await page.goto(`${BASE}/life-drafts/${ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=life-draft-heading]");
  await shot("life_draft.png");

  await page.goto(`${BASE}/map`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=map-heading]");
  await shot("place_gps_map.png");

  await page.goto(`${BASE}/dictionary`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=dictionary-list]");
  await shot("nickname_dictionary.png");

  await page.goto(`${BASE}/funerals/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-funeral-portraits]");
  await shot("funerals_missing.png");

  await page.goto(`${BASE}/atlas/empty`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=empty-atlas-list]");
  await shot("atlas_empty.png");

  await page.goto(`${BASE}/hunts/unfinished`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=unfinished-hunts]");
  await shot("unfinished_hunts.png");

  await page.goto(`${BASE}/reunions/seating/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-seating]");
  await shot("missing_seating.png");

  await page.goto(`${BASE}/dictionary/unused`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=unused-nicknames]");
  await shot("unused_nicknames.png");

  await browser.close();
  writeFileSync(`${MEDIA}/funeral_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui funeral layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
