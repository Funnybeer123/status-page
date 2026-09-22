import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng, makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-this");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker this" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
    { key: "helen", displayName: "Helen Park", givenName: "Helen", familyName: "Park", birthDate: "1954-09-22" },
    { key: "ned", displayName: "Ned Park", givenName: "Ned", familyName: "Park", birthDate: "1956-04-01" },
    { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
    { key: "gap", displayName: "Unknown Whitaker" },
  ]) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  await client.json("/api/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.maya }),
  });
  for (const [from, to, type] of [
    [ids.rose, ids.helen, "parent"],
    [ids.louis, ids.helen, "parent"],
    [ids.rose, ids.ned, "parent"],
    [ids.helen, ids.maya, "parent"],
  ] as const) {
    await client.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPersonId: from, toPersonId: to, type }),
    });
  }
  const peter = await client.json<{ person: { id: string } }>("/api/people", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "Peter Park", birthDate: "1988-04-03" }),
  });
  ids.peter = peter.body.person.id;
  await client.json("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPersonId: ids.helen, toPersonId: ids.peter, type: "adoptive" }),
  });
  const tom = await client.json<{ person: { id: string } }>("/api/people", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "Tom Park", birthDate: "1952-02-02" }),
  });
  ids.tom = tom.body.person.id;
  const partner = await client.json<{ relationship: { id: string } }>("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPersonId: ids.helen, toPersonId: ids.tom, type: "partner", startedAt: "1974-06-01" }),
  });
  await client.json("/api/relationships", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: partner.body.relationship.id, endedAt: "1982-09-15", endedKind: "divorce" }),
  });
  await client.json("/api/facts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, kind: "death", happenedOn: "2008-11-05" }),
  });
  for (const place of [
    { personId: ids.rose, name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa", startedAt: "1929-03-08", endedAt: "1948-06-14" },
    { personId: ids.rose, name: "North farm", locality: "Cedar Falls", region: "Iowa", startedAt: "1948-06-14", endedAt: "2008-11-02" },
  ]) {
    await client.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(place),
    });
  }
  const prompt = await client.json<{ prompt: { id: string } }>("/api/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "How did Rose meet Louis?", body: "Tell it at the table." }),
  });
  await client.json("/api/prompts/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promptId: prompt.body.prompt.id, body: "At the millinery counter on Market Street." }),
  });
  const share = await client.json<{ href: string }>("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "memorial", entityId: ids.rose }),
  });
  ids.share = share.body.href;
  const scan = makeLetterPng();
  const letter = new FormData();
  letter.set("file", new Blob([scan.bytes], { type: "image/png" }), "rose.png");
  letter.set("title", "Rose to Helen, 1952");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", ids.rose);
  const saved = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = saved.body.document.id;
  await client.json(`/api/letters/${ids.letter}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: `${ROSE_LETTER}\n\nA later hand dated the margin.` }),
  });
  const photo = new FormData();
  photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "unknown.svg");
  photo.set("title", "Unknown faces");
  await client.json("/api/assets", { method: "POST", body: photo });
  await client.json("/api/trash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "person", id: ids.gap }),
  });
  await client.json(`/api/people/${ids.rose}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ causeOfDeath: "In her sleep", languages: "English", burialPlot: "Fairview lot 4" }),
  });
  const album = await client.json<{ album: { id: string } }>("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Market Street pictures", summary: "The millinery years." }),
  });
  ids.album = album.body.album.id;
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

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-me]");
  await shot("this_me_home.png");

  await page.goto(`${BASE}/me`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=me-heading]");
  await shot("this_me.png");

  await page.goto(`${BASE}/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-heading]");
  await shot("this_missing.png");

  await page.goto(`${BASE}/conflicts`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=conflicts-heading]");
  await shot("this_conflicts.png");

  await page.goto(`${BASE}/tree`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=tree-heading]");
  await shot("this_tree_rels.png");

  await page.goto(`${BASE}/people/${member.ids.helen}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=family-links]");
  await shot("this_divorce.png");

  await page.goto(`${BASE}/map?personId=${member.ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=map-heading]");
  await shot("this_migration.png");

  await page.goto(`${BASE}/compare?from=${member.ids.rose}&to=${member.ids.helen}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=compare-heading]");
  await shot("this_compare.png");

  await page.goto(`${BASE}/prompts`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=prompts-heading]");
  await shot("this_prompts.png");

  await page.goto(`${BASE}${member.ids.share}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=share-memorial]");
  await shot("this_share.png");

  await page.goto(`${BASE}/letters/${member.ids.letter}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=transcript-history]");
  await shot("this_transcript.png");

  await page.goto(`${BASE}/trash`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=trash-heading]");
  await shot("this_trash.png");

  await page.goto(`${BASE}/living`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=living-heading]");
  await shot("this_living.png");

  await page.goto(`${BASE}/longevity`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=longevity-heading]");
  await shot("this_longevity.png");

  await page.goto(`${BASE}/cousins`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=cousins-heading]");
  await shot("this_cousins.png");

  await page.goto(`${BASE}/fan?personId=${member.ids.maya}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=fan-heading]");
  await shot("this_fan.png");

  await page.goto(`${BASE}/directory`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=directory-heading]");
  await shot("this_directory.png");

  await page.goto(`${BASE}/correspondence`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=correspondence-heading]");
  await shot("this_correspondence.png");

  await page.goto(`${BASE}/unidentified`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=unidentified-heading]");
  await shot("this_unidentified.png");

  await page.goto(`${BASE}/photographed`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=photographed-heading]");
  await shot("this_photographed.png");

  await page.goto(`${BASE}/years`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=years-heading]");
  await shot("this_years.png");

  await browser.close();
  writeFileSync(`${MEDIA}/this_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui this layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
