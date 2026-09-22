import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-ask-save");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker ask-save" });
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
  const picnic = new FormData();
  picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
  picnic.set("title", "Hart picnic, 1961");
  picnic.set("personIds", ids.rose);
  const savedPicnic = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
  ids.picnic = savedPicnic.body.asset.id;
  const bibleScan = new FormData();
  bibleScan.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "bible.svg");
  bibleScan.set("title", "Whitaker Bible flyleaf");
  const savedBible = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: bibleScan });
  ids.biblePage = savedBible.body.asset.id;
  const letter = new FormData();
  letter.set("title", "June to Maya about Rose");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", "I found Rose's first hatband note in the upstairs hall.");
  letter.set("personIds", ids.rose);
  const savedLetter = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = savedLetter.body.document.id;
  const undated = new FormData();
  undated.set("title", "A note still waiting for a date");
  undated.set("transcript", "We should date this later.");
  const savedUndated = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: undated });
  ids.undated = savedUndated.body.document.id;
  for (const job of [
    { title: "Milliner", employer: "Market Street", startedOn: "1946-03-01", endedOn: "1952-06-01" },
    { title: "Hat shop keeper", employer: "Market Street", startedOn: "1950-01-01", endedOn: "1956-01-01" },
  ]) {
    await client.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "occupation", personId: ids.rose, place: "Cedar Falls", ...job }),
    });
  }
  const cemetery = await client.json<{ cemetery: { id: string } }>("/api/cemeteries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Fairview Cemetery", locality: "Cedar Falls", region: "Iowa" }),
  });
  ids.cemetery = cemetery.body.cemetery.id;
  await client.json("/api/cemeteries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cemeteryId: ids.cemetery, personId: ids.rose, plot: "Lot 14", x: 42, y: 38 }),
  });
  await client.json("/api/cemeteries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cemeteryId: ids.cemetery, personId: ids.louis, plot: "Lot 16" }),
  });
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker reunion at the north farm",
      place: "North farm",
      happenedOn: "2026-07-04",
      personIds: [ids.maya, ids.june],
    }),
  });
  ids.reunion = reunion.body.reunion.id;
  await client.json("/api/reunions/dishes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reunionId: ids.reunion, title: "Sunday rolls", personId: ids.june }),
  });
  const heirloom = await client.json<{ heirloom: { id: string } }>("/api/heirlooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Rose's cedar chest", personId: ids.june }),
  });
  await client.json("/api/reunions/bring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reunionId: ids.reunion,
      personId: ids.maya,
      kind: "photo",
      title: "Hart picnic, 1961",
      assetId: ids.picnic,
    }),
  });
  await client.json("/api/reunions/bring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reunionId: ids.reunion,
      personId: ids.june,
      kind: "heirloom",
      title: "Rose's cedar chest",
      heirloomId: heirloom.body.heirloom.id,
    }),
  });
  const bible = await client.json<{ record: { id: string } }>("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "bible",
      title: "Whitaker family Bible",
      holderId: ids.june,
      body: "Rose kept the navy hatband in the flyleaf.",
      recordedAt: "1952-06-14",
    }),
  });
  await client.json("/api/family-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "bible",
      title: "A second Bible still waiting for a page",
      holderId: ids.maya,
      body: "The flyleaf is blank until we attach a scan.",
    }),
  });
  await client.json("/api/bibles/page", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bibleId: bible.body.record.id, assetId: ids.biblePage }),
  });
  const obit = new FormData();
  obit.set("title", "Rose Whitaker of Cedar Falls");
  obit.set("writtenAt", "2008-11-05");
  obit.set("transcript", "Rose Whitaker, who kept the millinery counter, died at home.");
  obit.set("personIds", ids.rose);
  const savedObit = await client.json<{ document: { id: string } }>("/api/obituaries", { method: "POST", body: obit });
  await client.json("/api/obituaries/portrait", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: savedObit.body.document.id, personId: ids.rose }),
  });
  const place = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa" }),
  });
  ids.place = place.body.place.id;
  await client.json("/api/places/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId: ids.place, assetId: ids.picnic }),
  });
  const asked = await client.json<{ conversationId: string }>("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "What did June write about the hatband?" }),
  });
  const story = await client.json<{ story: { id: string } }>("/api/ask/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: asked.body.conversationId }),
  });
  ids.story = story.body.story.id;
  await client.json("/api/notifications/mute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "birthday", muted: true }),
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

  await page.goto(`${BASE}/stories/${ids.story}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=story-citations]");
  await shot("ask_story.png");

  await page.goto(`${BASE}/letters/${ids.letter}?q=hatband`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=letter-highlight]");
  await shot("letter_highlight.png");

  await page.goto(`${BASE}/cemeteries/${ids.cemetery}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=cemetery-plot-map]");
  await shot("cemetery_plot_map.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=reunion-bring]");
  await shot("reunion_bring.png");

  await page.goto(`${BASE}/people/${ids.rose}/occupations`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=occupation-overlaps]");
  await shot("occupation_overlap.png");

  await page.goto(`${BASE}/places/${ids.place}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=place-photos]");
  await shot("place_chronicle_photos.png");

  await page.goto(`${BASE}/letters`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=letters-index-heading]");
  await shot("letters_index.png");

  await page.goto(`${BASE}/notifications/muted`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=muted-notices-heading]");
  await shot("notice_mute.png");

  await page.goto(`${BASE}/bibles`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=bible-page]");
  await shot("bible_page.png");

  await page.goto(`${BASE}/obituaries`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=obituary-portrait]");
  await shot("obituary_portrait.png");

  await page.goto(`${BASE}/ask/stories`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=ask-stories-heading]");
  await shot("ask_stories.png");

  await page.goto(`${BASE}/cemeteries/unmapped`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=unmapped-plots-heading]");
  await shot("unmapped_plots.png");

  await page.goto(`${BASE}/letters/undated`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=undated-letters-heading]");
  await shot("letters_undated.png");

  await page.goto(`${BASE}/occupations/overlaps`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=overlaps-heading]");
  await shot("occupation_overlaps.png");

  await page.goto(`${BASE}/bibles/missing`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=missing-bible-heading]");
  await shot("missing_bible_pages.png");

  await page.goto(`${BASE}/cemeteries/${ids.cemetery}/map`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=plot-map-heading]");
  await shot("cemetery_plot_map_page.png");

  await browser.close();
  writeFileSync(`${MEDIA}/ask_save_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui ask-save layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
