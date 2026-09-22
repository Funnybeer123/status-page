import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng, makePhotoSvg, makeVideo } from "./helpers/fixtures";

const MEDIA = "/opt/cursor/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepareMember() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-maya");
  const signup = await client.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker family",
  });
  if (signup.status !== 200) throw new Error(`signup failed: ${signup.body.error}`);
  await client.signIn(email, PASSWORD);

  const peopleSpec = [
    { key: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02" },
    { key: "helen", displayName: "Helen Park", birthDate: "1954-09-19" },
    { key: "nora", displayName: "Nora Park", birthDate: "1983-01-30" },
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
    { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner" },
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

  const photo = new FormData();
  photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "market.svg");
  photo.set("title", "Market Street shop window");
  photo.set("capturedAt", "1952-06-14");
  photo.set("personIds", `${ids.rose},${ids.louis}`);
  await client.json("/api/assets", { method: "POST", body: photo });

  const video = makeVideo();
  const reel = new FormData();
  reel.set("file", new Blob([video.bytes], { type: "video/mp4" }), "reunion.mp4");
  reel.set("title", "Family reunion reel");
  reel.set("capturedAt", "1964-07-04");
  reel.set("kind", "video");
  reel.set("personIds", ids.helen);
  await client.json("/api/assets", { method: "POST", body: reel });

  const scan = makeLetterPng();
  const letter = new FormData();
  letter.set("file", new Blob([scan.bytes], { type: "image/png" }), "rose-letter.png");
  letter.set("title", "Aunt June on how Rose met Louis");
  letter.set("writtenAt", "1952-06-14");
  letter.set("transcript", ROSE_LETTER);
  letter.set("personIds", `${ids.rose},${ids.louis}`);
  const saved = await client.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });

  return { email, letterId: saved.body.document.id };
}

async function main() {
  mkdirSync(MEDIA, { recursive: true });
  const member = await prepareMember();
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const written: string[] = [];

  async function shot(name: string) {
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => undefined);
    const path = `${MEDIA}/${name}`;
    await page.screenshot({ path, fullPage: true });
    const size = statSync(path).size;
    if (size < 10_000) throw new Error(`${path} is too small (${size})`);
    written.push(path);
    console.log("wrote", path, size);
  }

  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle0" });
  await shot("member_signup.png");

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await page.type("input[type=email]", member.email);
  await page.type("input[type=password]", PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click("[data-testid=login-submit]"),
  ]);
  await page.goto(`${BASE}/tree`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=tree-heading]");
  const treeHtml = await page.content();
  if (!treeHtml.includes("Rose Whitaker") || treeHtml.includes("Eleanor Hart")) {
    throw new Error("tree screenshot session is not the member-created Whitaker family");
  }
  await shot("member_tree.png");

  await page.goto(`${BASE}/archive`, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/Market Street shop window");
  await shot("member_archive.png");

  await page.goto(`${BASE}/letters/${member.letterId}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/millinery counter");
  await shot("member_letter.png");

  await page.goto(`${BASE}/ask`, { waitUntil: "networkidle0" });
  await page.click("[data-testid=ask-submit]");
  await page.waitForFunction(() => document.body.innerText.includes("millinery") || document.body.innerText.includes("Market Street"), {
    timeout: 15000,
  });
  const askText = await page.evaluate(() => document.body.innerText);
  if (/Eleanor Whitaker|Cedar Falls|Grange hall/.test(askText)) {
    throw new Error("Ask UI used the Hart seed instead of the member letter");
  }
  await shot("member_ask_grandma.png");

  await page.goto(`${BASE}/families`, { waitUntil: "networkidle0" });
  await page.waitForSelector("text/Whitaker family");
  await shot("member_families.png");

  await browser.close();
  writeFileSync(`${MEDIA}/member_flow_manifest.txt`, written.join("\n") + "\n");
  console.log("ui member flow ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
