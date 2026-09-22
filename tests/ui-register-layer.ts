import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-register");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker register" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", middleName: "Mae", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
    { key: "blank", displayName: "Cousin Ned", givenName: "Ned", familyName: "Whitaker" },
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
    body: JSON.stringify({ personId: ids.june }),
  });
  await client.json("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1950-06-14" }),
  });
  await client.json("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPersonId: ids.june, toPersonId: ids.blank, type: "partner" }),
  });
  const first = new FormData();
  first.set("title", "Harvest letter");
  first.set("writtenAt", "1947-10-18");
  first.set("transcript", "Cedar Falls, Iowa\n18 October 1947\n\nDearest Ruth,\n\nI danced three times with Samuel Hart.\n\nHe has kind hands, and he calls me Whitaker as if it were a compliment.\n\nYour loving sister,\nEleanor");
  first.set("personIds", ids.rose);
  const savedFirst = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: first });
  ids.letter = savedFirst.body.document.id;
  await client.json(`/api/letters/${ids.letter}/margins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line: 8, body: "Mother still told it this way." }),
  });
  await client.json(`/api/letters/${ids.letter}/paper`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paperMill: "Crane & Co., Dalton" }),
  });
  await client.json("/api/originals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: ids.letter, personId: ids.june }),
  });
  const prairie = new FormData();
  prairie.set("title", "A note from the prairie");
  prairie.set("writtenAt", "1947-10-20");
  prairie.set("transcript", "The stamp is from a town I cannot place.");
  await client.json("/api/letters", { method: "POST", body: prairie });
  const will = await client.json<{ will: { id: string } }>("/api/wills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Rose Whitaker’s will",
      body: "The navy hatband goes to June.",
      writtenAt: "2007-11-02",
      personIds: [ids.rose],
    }),
  });
  ids.will = will.body.will.id;
  await client.json("/api/wills/witnesses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: ids.will, personId: ids.june, stoodOn: "2007-11-02" }),
  });
  await client.json("/api/names", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.june, kind: "birth", name: "June", namedById: ids.rose }),
  });
  await client.json("/api/crests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Whitaker arms", blazon: "Argent, a cottonwood proper" }),
  });
  await client.json("/api/phrases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phrase: "He called me Whitaker", meaning: "A compliment" }),
  });
  const rosePhoto = new FormData();
  rosePhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
  rosePhoto.set("title", "Rose at the Grange hall");
  rosePhoto.set("capturedAt", "1947-10-18T20:00:00Z");
  rosePhoto.set("personIds", ids.rose);
  const savedRose = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: rosePhoto });
  await client.json("/api/sitters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: savedRose.body.asset.id, personId: ids.rose }),
  });
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker harvest supper",
      place: "Grange hall",
      happenedOn: "2026-10-18",
      personIds: [ids.june, ids.blank],
    }),
  });
  ids.reunion = reunion.body.reunion.id;
  await client.json(`/api/reunions/${ids.reunion}/program`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Welcome", startsAt: "morning", personId: ids.june }),
  });
  await client.json(`/api/reunions/${ids.reunion}/program`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Grace", startsAt: "noon", personId: ids.blank }),
  });
  await client.json("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "A quiet picnic without a program",
      place: "North farm",
      happenedOn: "2026-07-04",
      personIds: [ids.june],
    }),
  });
  await client.json(`/api/people/${ids.june}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ middleName: "Ruth" }),
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

  await page.goto(`${BASE}/married`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=married-list]");
  await shot("married_years.png");

  await page.goto(`${BASE}/letters/${ids.letter}/margins`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=margin-script]");
  await shot("letter_margins.png");

  await page.goto(`${BASE}/wills/witnesses`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=will-witnesses-list]");
  await shot("will_witnesses.png");

  await page.goto(`${BASE}/names/given`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=named-by-list]");
  await shot("named_by.png");

  await page.goto(`${BASE}/crests`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=family-crest]");
  await shot("family_crest.png");

  await page.goto(`${BASE}/originals`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=originals-list]");
  await shot("original_holder.png");

  await page.goto(`${BASE}/phrases`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=phrases-list]");
  await shot("phrasebook.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/program`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=program-list]");
  await shot("reunion_program.png");

  await page.goto(`${BASE}/sitters`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=sitters-list]");
  await shot("portrait_sitter.png");

  await page.goto(`${BASE}/middles/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-middles-list]");
  await shot("missing_middles.png");

  await page.goto(`${BASE}/letters/paper`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=paper-list]");
  await shot("paper_mill.png");

  await page.goto(`${BASE}/married/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-married-list]");
  await shot("married_missing.png");

  await page.goto(`${BASE}/letters/margins/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-margins-list]");
  await shot("letter_margins_missing.png");

  await page.goto(`${BASE}/wills/witnesses/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-will-witnesses-heading]");
  await shot("will_witnesses_missing.png");

  await page.goto(`${BASE}/reunions/programs/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-programs-list]");
  await shot("reunion_program_missing.png");

  await browser.close();
  writeFileSync(`${MEDIA}/register_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui register layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
