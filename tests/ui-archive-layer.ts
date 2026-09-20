import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng } from "./helpers/fixtures";

const MEDIA = "/opt/cursor/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

function daysFromToday(offset: number) {
  const now = new Date();
  const date = new Date(Date.UTC(1990, now.getUTCMonth(), now.getUTCDate() + offset));
  return date.toISOString().slice(0, 10);
}

async function prepareArchiveFamily() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-archive");
  await client.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker archive",
  });
  await client.signIn(email, PASSWORD);

  const peopleSpec = [
    { key: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
    { key: "helen", displayName: "Helen Park", birthDate: "1954-09-19" },
    { key: "nora", displayName: "Nora Park", birthDate: daysFromToday(4), notes: "Keeps a secret diary at 14 Oak Street." },
  ];
  const ids: Record<string, string> = {};
  for (const person of peopleSpec) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  for (const link of [
    { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" },
    { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
    { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
    { fromPersonId: ids.helen, toPersonId: ids.nora, type: "parent" },
  ]) {
    await client.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(link),
    });
  }

  await client.json("/api/names", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose, kind: "maiden", name: "Rose Gable", startedAt: "1929-03-08", endedAt: "1953-05-01" }),
  });
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      name: "Market Street rooms",
      locality: "Millinery block",
      region: "Iowa",
      startedAt: "1948-01-01",
      endedAt: "1954-09-01",
    }),
  });
  await client.json("/api/residences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.nora, name: "14 Oak Street", startedAt: "2010-01-01" }),
  });
  await client.json("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personId: ids.rose,
      otherPersonId: ids.louis,
      kind: "other",
      title: "Millinery counter meeting",
      summary: "Louis bought a navy hatband.",
      happenedOn: "1952-06-14",
    }),
  });

  const scan = makeLetterPng();
  const letter = new FormData();
  letter.set("file", new Blob([scan.bytes], { type: "image/png" }), "rose-letter.png");
  letter.set("title", "Aunt June on how Rose met Louis");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", `${ids.rose},${ids.louis}`);
  const saved = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });

  await client.json("/api/citations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      claim: "Rose's maiden name was Gable before she married Louis.",
      personId: ids.rose,
      documentId: saved.body.document.id,
      pageNote: "Aunt June, 1952",
    }),
  });

  const story = await client.json<{ story: { id: string } }>("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "The felted navy brim",
      body: "Helen said Rose always kept the felted navy brim on a wooden block above the counter.",
      recordedAt: "2014-04-20",
      tellerPersonId: ids.helen,
      personIds: [ids.rose, ids.louis, ids.helen],
    }),
  });

  const invite = await client.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("ui-viewer");
  await viewer.signup({ name: "Vera Viewer", email: viewerEmail, password: PASSWORD, invite: invite.body.token });

  return { email, viewerEmail, ids, storyId: story.body.story.id };
}

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const member = await prepareArchiveFamily();
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

  await page.goto(`${BASE}/timeline`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=timeline-heading]");
  const timelineText = await page.evaluate(() => document.body.innerText);
  if (!timelineText.includes("Millinery counter meeting")) {
    throw new Error("timeline is missing the member-entered millinery event");
  }
  await shot("archive_timeline.png");

  await page.goto(`${BASE}/stories`, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/The felted navy brim");
  await shot("archive_stories.png");

  await page.goto(`${BASE}/search?q=Gable`, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/Rose Gable");
  await shot("archive_search.png");

  await page.goto(`${BASE}/dates`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=dates-heading]");
  await shot("archive_dates.png");

  await page.goto(`${BASE}/related?from=${member.ids.nora}&to=${member.ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=related-result]");
  const relatedText = await page.evaluate(() => document.body.innerText);
  if (!relatedText.includes("grandchild")) throw new Error("related page missing grandchild path");
  await shot("archive_related.png");

  await page.goto(`${BASE}/people/${member.ids.rose}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/Rose Gable");
  await page.waitForSelector("text/Market Street rooms");
  await shot("archive_person.png");

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    const email = document.querySelector("input[type=email]") as HTMLInputElement | null;
    const password = document.querySelector("input[type=password]") as HTMLInputElement | null;
    if (email) email.value = "";
    if (password) password.value = "";
  });
  await page.type("input[type=email]", member.viewerEmail);
  await page.type("input[type=password]", PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click("[data-testid=login-submit]"),
  ]);
  await page.goto(`${BASE}/people/${member.ids.nora}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=living-privacy-note]");
  const viewerText = await page.evaluate(() => document.body.innerText);
  if (viewerText.includes("14 Oak Street") || viewerText.includes("secret diary")) {
    throw new Error("viewer screenshot leaked living-person facts");
  }
  await shot("archive_privacy_viewer.png");

  await page.goto(`${BASE}/login?demo=1`, { waitUntil: "networkidle0" });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click("[data-testid=login-submit]"),
  ]);
  await page.goto(`${BASE}/timeline`, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/Harvest dance");
  await shot("hart_timeline.png");
  await page.goto(`${BASE}/search?q=Whitaker`, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/Eleanor Whitaker");
  await shot("hart_search.png");
  await page.goto(`${BASE}/stories`, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/cottonwood");
  await shot("hart_stories.png");

  await browser.close();
  writeFileSync(`${MEDIA}/archive_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui archive layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
