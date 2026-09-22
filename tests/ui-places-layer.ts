import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-places");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker places" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
    { key: "june", displayName: "June Whitaker", birthDate: "1956-04-01" },
    { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
    { key: "tom", displayName: "Tom Whitaker", birthDate: "1985-06-12" },
    { key: "agnes", displayName: "Agnes Whitaker", birthDate: "1926-04-08" },
    { key: "peter", displayName: "Peter Whitaker", birthDate: "1988-04-03" },
    { key: "clara", displayName: "Clara Whitaker", birthDate: "1901-02-02", deathDate: "2001-11-02" },
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
    { fromPersonId: ids.rose, toPersonId: ids.june, type: "parent" },
    { fromPersonId: ids.louis, toPersonId: ids.june, type: "parent" },
    { fromPersonId: ids.helen, toPersonId: ids.maya, type: "parent" },
    { fromPersonId: ids.june, toPersonId: ids.tom, type: "parent" },
    { fromPersonId: ids.louis, toPersonId: ids.peter, type: "adoptive" },
  ]) {
    const created = await client.json<{ relationship: { id: string; type: string } }>("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rel),
    });
    if (rel.type === "adoptive") ids.adoptive = created.body.relationship.id;
  }

  const us = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "United States", country: "United States", kind: "country" }),
  });
  ids.us = us.body.place.id;
  const iowa = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Iowa", region: "Iowa", country: "United States", kind: "state", parentId: ids.us }),
  });
  ids.iowa = iowa.body.place.id;
  const county = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Black Hawk County", locality: "Black Hawk County", region: "Iowa", kind: "county", parentId: ids.iowa }),
  });
  ids.county = county.body.place.id;
  const city = await client.json<{ place: { id: string } }>("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa", kind: "city", parentId: ids.county }),
  });
  ids.city = city.body.place.id;
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, placeId: ids.city, startedAt: "1948-06-14", notes: "Above the millinery counter" }),
  });
  await client.json("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      kind: "other",
      title: "Harvest dance at the Grange",
      happenedOn: "1947-10-18",
      placeId: ids.city,
      precision: "circa",
      rangeEnd: "1947-10-31",
    }),
  });
  await client.json("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Lost Town", kind: "city" }),
  });

  const letter = new FormData();
  letter.set("title", "June to Helen, millinery counter");
  letter.set("kind", "letter");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", `${ids.rose},${ids.louis}`);
  const saved = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
  ids.letter = saved.body.document.id;
  const copy = new FormData();
  copy.set("title", "June to Helen, second typing");
  copy.set("kind", "letter");
  copy.set("writtenAt", "1952-06-14");
  copy.set("transcript", "A later typing of the same day.");
  copy.set("personIds", `${ids.louis},${ids.rose}`);
  await client.json("/api/letters", { method: "POST", body: copy });

  const handA = await client.json<{ sample: { id: string } }>("/api/handwriting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, documentId: ids.letter, notes: "The long loops on cider." }),
  });
  ids.handA = handA.body.sample.id;
  const handB = await client.json<{ sample: { id: string } }>("/api/handwriting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.louis, documentId: ids.letter, notes: "Short, upright strokes." }),
  });
  ids.handB = handB.body.sample.id;

  const paperDoc = new FormData();
  paperDoc.set("title", "Adoption of Peter Whitaker");
  paperDoc.set("kind", "note");
  paperDoc.set("writtenAt", "1994-05-12");
  paperDoc.set("transcript", "Louis adopted Peter after the flood year.");
  paperDoc.set("personIds", `${ids.louis},${ids.peter}`);
  const doc = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: paperDoc });
  await client.json("/api/adoptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      relationshipId: ids.adoptive,
      documentId: doc.body.document.id,
      grantedOn: "1994-05-12",
      notes: "After the flood year.",
    }),
  });

  const picnic = new FormData();
  picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "picnic.svg");
  picnic.set("title", "Whitaker picnic");
  picnic.set("capturedAt", "1961-07-04");
  picnic.set("personIds", ids.helen);
  const picnicAsset = await client.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
  ids.picnic = picnicAsset.body.asset.id;
  const album = await client.json<{ album: { id: string } }>("/api/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Park picnic album" }),
  });
  await client.json(`/api/albums/${album.body.album.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId: ids.picnic }),
  });
  await client.json("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.helen, granted: true }),
  });
  const share = await client.json<{ link: { token: string } }>("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "album", entityId: album.body.album.id }),
  });
  ids.share = share.body.link.token;

  await client.json("/api/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.maya }),
  });
  await client.json("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Sunday rolls from Maya",
      body: "Maya still makes the navy-blue bowl of Sunday rolls.",
      recordedAt: "2026-03-12",
      tellerPersonId: ids.maya,
      personIds: [ids.maya],
    }),
  });
  const mayaPhoto = new FormData();
  mayaPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "maya.svg");
  mayaPhoto.set("title", "Maya at the picnic");
  mayaPhoto.set("personIds", ids.maya);
  await client.json("/api/assets", { method: "POST", body: mayaPhoto });

  return { email, ids };
}

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const { email, ids } = await prepare();
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    headless: true,
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

  await page.goto(`${BASE}/places?within=${ids.iowa}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=place-filter-people]");
  await shot("places_hierarchy.png");

  await page.goto(`${BASE}/places/tree`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=place-tree]");
  await shot("places_tree.png");

  await page.goto(`${BASE}/letters/duplicates`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=letter-duplicates-list]");
  await shot("letter_duplicates.png");

  await page.goto(`${BASE}/handwriting/compare?a=${ids.handA}&b=${ids.handB}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=handwriting-compare]");
  await shot("handwriting_compare.png");

  await page.goto(`${BASE}/milestones?year=2026`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=milestones-list]");
  await shot("milestones.png");

  await page.goto(`${BASE}/book`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=book-pdf]");
  await shot("book_pdf.png");

  await page.goto(`${BASE}/s/${ids.share}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=share-watermark]");
  await shot("share_watermark.png");

  await page.goto(`${BASE}/cousins/worksheet?personId=${ids.helen}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=cousin-worksheet]");
  await shot("cousin_worksheet.png");

  await page.goto(`${BASE}/dates/ranges`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=date-ranges-list]");
  await shot("date_ranges.png");

  await page.goto(`${BASE}/adoptions`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=adoptions-list]");
  await shot("adoptions.png");

  await page.goto(`${BASE}/start`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=start-wizard]");
  await shot("start_here.png");

  await page.goto(`${BASE}/places/gaps`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=place-gaps-list]");
  await shot("place_gaps.png");

  await page.goto(`${BASE}/anniversaries?year=2026`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=anniversaries-list]");
  await shot("anniversaries.png");

  await page.goto(`${BASE}/needed`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=needed-heading]");
  await shot("needed.png");

  await browser.close();
  writeFileSync(`${MEDIA}/places_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui places layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
