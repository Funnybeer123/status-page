import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-ask");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker ask" });
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
  const letter = new FormData();
  letter.set("title", "June to Helen, millinery counter");
  letter.set("kind", "letter");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("translation", "Rose met Louis at the millinery counter. He bought a navy hatband.");
  letter.set("personIds", `${ids.rose},${ids.louis}`);
  const saved = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = saved.body.document.id;
  const reply = new FormData();
  reply.set("title", "Helen to June, about the hatband");
  reply.set("kind", "letter");
  reply.set("writtenAt", "1952-06-20");
  reply.set("transcript", "June, I still keep the navy hatband in the cedar drawer.");
  reply.set("replyToId", ids.letter);
  reply.set("personIds", ids.rose);
  const replied = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: reply });
  ids.reply = replied.body.document.id;
  const scan = new FormData();
  scan.set("title", "Faded scan of Rose’s second page");
  scan.set("kind", "letter");
  scan.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "faded.svg");
  scan.set("personIds", ids.rose);
  await client.json("/api/letters", { method: "POST", body: scan });
  const asked = await client.json<{ conversationId: string }>("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "How did grandma meet grandpa?" }),
  });
  ids.conversation = asked.body.conversationId;
  await client.json("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "What did she say about the hatband?",
      conversationId: ids.conversation,
    }),
  });
  await client.json("/api/ask/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: ids.conversation, saved: true }),
  });
  await client.json("/api/custody", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      holderId: ids.maya,
      title: "Millinery letter",
      kind: "letter",
      documentId: ids.letter,
      notes: "In the cedar drawer.",
    }),
  });
  await client.json("/api/businesses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Whitaker Millinery",
      place: "Market Street",
      startedOn: "1948-04-01",
      personIds: [ids.rose],
    }),
  });
  await client.json("/api/awards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, title: "County fair hat ribbon", place: "Cedar Falls", awardedOn: "1953-08-14" }),
  });
  await client.json("/api/clubs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, club: "Market Street Merchants", place: "Cedar Falls" }),
  });
  const photo = new FormData();
  photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "market.svg");
  photo.set("title", "Market Street counter");
  const first = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
  const laterPhoto = new FormData();
  laterPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "later.svg");
  laterPhoto.set("title", "Market Street today");
  const later = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: laterPhoto });
  const album = await client.json<{ album: { id: string } }>("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Market Street album", summary: "The counter and the letter years." }),
  });
  ids.album = album.body.album.id;
  await client.json(`/api/albums/${ids.album}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: first.body.asset.id }),
  });
  await client.json(`/api/albums/${ids.album}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: later.body.asset.id }),
  });
  for (const row of [
    { kind: "probate", personId: ids.rose, title: "Rose Whitaker’s estate", place: "Cedar Falls", happenedOn: "2008-12-01" },
    { kind: "naturalization", personId: ids.louis, court: "Northern District of Iowa", place: "Iowa City" },
    { kind: "address", personId: ids.rose, label: "Millinery rooms", line: "14 Market Street", locality: "Cedar Falls" },
    { kind: "apprenticeship", personId: ids.rose, trade: "Millinery", master: "Aunt June" },
    { kind: "mention", personId: ids.rose, headline: "Whitaker fitted the navy brim", paper: "Cedar Falls Record" },
    { kind: "pet", personId: ids.rose, name: "Felt", petKind: "Shop cat" },
    { kind: "textile", makerId: ids.rose, title: "Navy hatband sampler", textileKind: "sampler" },
    { kind: "dna", personId: ids.maya, haplogroup: "H1", company: "23andMe" },
  ]) {
    await client.json("/api/later-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
  }
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

  await page.goto(`${BASE}/ask?conversationId=${member.ids.conversation}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=ask-thread]");
  await shot("ask_followup.png");

  await page.goto(`${BASE}/ask/saved`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=saved-ask-heading]");
  await shot("ask_saved.png");

  await page.goto(`${BASE}/letters/${member.ids.reply}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=letter-reply-to]");
  await shot("ask_letter_reply.png");

  await page.goto(`${BASE}/letters/${member.ids.letter}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=letter-translation]");
  await shot("ask_letter_translation.png");

  await page.goto(`${BASE}/ocr`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=ocr-heading]");
  await shot("ask_ocr_queue.png");

  await page.goto(`${BASE}/custody`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=custody-heading]");
  await shot("ask_custody.png");

  await page.goto(`${BASE}/businesses`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=businesses-heading]");
  await shot("ask_businesses.png");

  await page.goto(`${BASE}/awards`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=awards-heading]");
  await shot("ask_awards.png");

  await page.goto(`${BASE}/clubs`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=clubs-heading]");
  await shot("ask_clubs.png");

  await page.goto(`${BASE}/book`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=book-name-index]");
  await shot("ask_book_index.png");

  await page.goto(`${BASE}/albums/${member.ids.album}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=album-slideshow]");
  await shot("ask_slideshow.png");

  await page.goto(`${BASE}/probate`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=probate-heading]");
  await shot("ask_probate.png");

  await page.goto(`${BASE}/naturalizations`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=naturalizations-heading]");
  await shot("ask_naturalizations.png");

  await page.goto(`${BASE}/addresses`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=addresses-heading]");
  await shot("ask_addresses.png");

  await page.goto(`${BASE}/apprentices`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=apprentices-heading]");
  await shot("ask_apprentices.png");

  await page.goto(`${BASE}/mentions`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=mentions-heading]");
  await shot("ask_mentions.png");

  await page.goto(`${BASE}/pets`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=pets-heading]");
  await shot("ask_pets.png");

  await page.goto(`${BASE}/quilts`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=quilts-heading]");
  await shot("ask_quilts.png");

  await page.goto(`${BASE}/dna`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=dna-heading]");
  await shot("ask_dna.png");

  await browser.close();
  writeFileSync(`${MEDIA}/ask_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui ask layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
