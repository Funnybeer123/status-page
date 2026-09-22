import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-hunt");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker hunt" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "june", displayName: "June Whitaker", givenName: "June", familyName: "Whitaker", birthDate: "1956-04-01" },
    { key: "helen", displayName: "Helen Whitaker", givenName: "Helen", familyName: "Whitaker", birthDate: "1954-09-12" },
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
    { fromPersonId: ids.rose, toPersonId: ids.june, type: "parent" },
    { fromPersonId: ids.louis, toPersonId: ids.june, type: "parent" },
    { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
    { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
    { fromPersonId: ids.june, toPersonId: ids.maya, type: "parent" },
  ]) {
    await client.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rel),
    });
  }
  await client.json("/api/names", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, kind: "maiden", name: "Rose Gable" }),
  });
  const place = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Cedar Falls",
      locality: "Cedar Falls",
      region: "Iowa",
      latitude: 42.5278,
      longitude: -92.4453,
    }),
  });
  ids.place = place.body.place.id;
  const letter = new FormData();
  letter.set("title", "June to Maya about Rose");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", "I found Rose's first hatband note in the upstairs hall.\n\nKeep it with the cedar chest.");
  letter.set("personIds", ids.rose);
  const savedLetter = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = savedLetter.body.document.id;
  const weddingPhoto = new FormData();
  weddingPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "wedding.svg");
  weddingPhoto.set("title", "Rose and Louis married");
  weddingPhoto.set("capturedAt", "1948-06-14T14:00:00Z");
  weddingPhoto.set("personIds", `${ids.rose},${ids.louis}`);
  const savedWedding = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: weddingPhoto });
  ids.weddingPhoto = savedWedding.body.asset.id;
  const picnic = new FormData();
  picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
  picnic.set("title", "Hart picnic, 1961");
  picnic.set("capturedAt", "1961-07-04T16:00:00Z");
  picnic.set("personIds", ids.rose);
  const savedPicnic = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
  ids.picnic = savedPicnic.body.asset.id;
  const story = await client.json<{ story: { id: string } }>("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Cottonwoods this summer",
      body: "June said the cottonwoods still hold the walk home.",
      tellerPersonId: ids.june,
    }),
  });
  ids.story = story.body.story.id;
  const wedding = await client.json<{ event: { id: string } }>("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      otherPersonId: ids.louis,
      kind: "marriage",
      title: "Rose and Louis married",
      happenedOn: "1948-06-14",
      placeId: ids.place,
    }),
  });
  ids.wedding = wedding.body.event.id;
  await client.json("/api/witnesses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId: ids.wedding, personId: ids.june, role: "witness" }),
  });
  for (const home of [
    { personId: ids.rose, startedAt: "1948-06-14", endedAt: "2008-11-02" },
    { personId: ids.louis, startedAt: "1946-01-01", endedAt: "2011-01-14" },
  ]) {
    await client.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...home, placeId: ids.place }),
    });
  }
  const hunt = await client.json<{ hunt: { id: string } }>("/api/hunts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Harvest scavenger hunt", notes: "Look in the archive first." }),
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
  await client.json("/api/hunts/clues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      huntId: ids.hunt,
      clue: "Sunday rolls in 1961.",
      targetKind: "photo",
      answer: "Hart picnic, 1961",
      assetId: ids.picnic,
    }),
  });
  await client.json("/api/hunts/clues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      huntId: ids.hunt,
      clue: "The town they lived in together.",
      targetKind: "place",
      answer: "Cedar Falls",
      placeId: ids.place,
    }),
  });
  await client.json("/api/place-pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId: ids.place, title: "Harvest letter at Cedar Falls", documentId: ids.letter }),
  });
  await client.json("/api/newsletter/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      month: "2026-09",
      body: "Dear family — we found the hatband letter this month. Edit this before it goes out.",
    }),
  });
  await client.json("/api/research/checklist");
  const motto = await client.json<{ record: { id: string } }>("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "motto", text: "Courtesy to the trees", notes: "Said of the cottonwoods." }),
  });
  await client.json("/api/mottos/prefer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mottoId: motto.body.record.id }),
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

  await page.goto(`${BASE}/hunts/${ids.hunt}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=hunt-clues]");
  await shot("scavenger_hunt.png");

  await page.goto(`${BASE}/map/pins`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=place-pins-heading]");
  await shot("map_letter_pin.png");

  await page.goto(`${BASE}/siblings/${ids.june}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=birth-order-list]");
  await shot("birth_order.png");

  await page.goto(`${BASE}/weddings/${ids.wedding}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=wedding-party-heading]");
  await shot("wedding_party.png");

  await page.goto(`${BASE}/places/${ids.place}/together`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=contemporaries-heading]");
  await shot("lived_together.png");

  await page.goto(`${BASE}/newsletter/draft?month=2026-09`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=newsletter-draft-heading]");
  await shot("newsletter_draft.png");

  await page.goto(`${BASE}/names`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=both-names-heading]");
  await shot("maiden_married_search.png");

  await page.goto(`${BASE}/research/checklist`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=research-checklist]");
  await shot("research_checklist.png");

  await page.goto(`${BASE}/letters/${ids.letter}/aloud`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=read-aloud]");
  await shot("read_aloud.png");

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-motto]");
  await shot("home_motto.png");

  await page.goto(`${BASE}/map`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=map-heading]");
  await shot("map_with_pins.png");

  await page.goto(`${BASE}/hunts`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=hunts-heading]");
  await shot("hunts_index.png");

  await page.goto(`${BASE}/siblings`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=sibling-sets-heading]");
  await shot("sibling_sets.png");

  await page.goto(`${BASE}/contemporaries`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=family-contemporaries-heading]");
  await shot("contemporaries_index.png");

  await page.goto(`${BASE}/weddings/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-witnesses-heading]");
  await shot("weddings_missing.png");

  await browser.close();
  writeFileSync(`${MEDIA}/hunt_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui hunt layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
