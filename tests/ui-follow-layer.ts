import puppeteer from "puppeteer-core";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const MEDIA = "/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PASSWORD = "millinery-1952";

async function prepare() {
  const client = new ApiClient();
  const email = uniqueEmail("ui-follow");
  await client.signup({ name: "Maya Park", email, password: PASSWORD, familyName: "Whitaker follow" });
  await client.signIn(email, PASSWORD);
  const ids: Record<string, string> = {};
  for (const person of [
    { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
    { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
    { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
    { key: "june", displayName: "June Whitaker", birthDate: "1956-04-01" },
  ]) {
    const created = await client.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(person),
    });
    ids[person.key] = created.body.person.id;
  }
  await client.json("/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose }),
  });
  await client.json("/api/follows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: ids.rose }),
  });
  const cousinInvite = await client.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "contributor" }),
  });
  const cousin = new ApiClient();
  const cousinEmail = uniqueEmail("ui-follow-cousin");
  await cousin.signup({ name: "Ned Whitaker", email: cousinEmail, password: PASSWORD, invite: cousinInvite.body.token });
  await cousin.signIn(cousinEmail, PASSWORD);
  await cousin.json("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Ned remembered Rose's navy hatband",
      body: "Ned found the hatband after the picnic.",
      personIds: [ids.rose],
    }),
  });
  const story = await client.json<{ story: { id: string } }>("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "The millinery hatband Rose kept",
      body: "Rose kept the navy hatband in the cedar drawer.",
      personIds: [ids.rose],
    }),
  });
  ids.story = story.body.story.id;
  await client.json("/api/keep-out", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "story", id: ids.story, keepOut: true }),
  });
  const voyage = await client.json<{ voyage: { id: string } }>("/api/voyages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ship: "SS Eastern Star",
      departedFrom: "Hong Kong",
      arrivedAt: "San Francisco",
      departedOn: "1972-03-04",
      personIds: [ids.louis],
    }),
  });
  ids.voyage = voyage.body.voyage.id;
  const reunion = await client.json<{ reunion: { id: string } }>("/api/reunions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Whitaker reunion at the north farm",
      place: "Cedar Falls",
      happenedOn: "2026-07-04",
      personIds: [ids.maya, ids.june],
    }),
  });
  ids.reunion = reunion.body.reunion.id;
  const share = await client.json<{ link: { token: string } }>("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "memorial", entityId: ids.rose }),
  });
  ids.share = share.body.link.token;
  await new ApiClient().html(`/s/${ids.share}`);
  await client.json("/api/share", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: ids.share, revoke: true }),
  });
  await client.json("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "archives@cedarfalls.lib",
      purpose: "researcher",
      expiresOn: "2027-12-31",
    }),
  });
  const page = new FormData();
  page.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "fairview.svg");
  page.set("title", "Fairview burial notice");
  page.set("transcript", "Rose Whitaker was named in the Courier.");
  page.set("writtenAt", "2008-11-04");
  page.set("personIds", ids.rose);
  await client.json("/api/clippings", { method: "POST", body: page });
  const journal = await client.json<{ entry: { id: string } }>("/api/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Private cider note",
      body: "She said the cider was too sweet.",
      keepOut: true,
    }),
  });
  ids.journal = journal.body.entry.id;
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

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=home-bookmarks]");
  await shot("bookmarks.png");

  await page.goto(`${BASE}/following`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=following-heading]");
  await shot("following.png");

  await page.goto(`${BASE}/notifications`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=notifications-list]");
  await shot("follow_notice.png");

  await page.goto(`${BASE}/shared/links`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=share-links-heading]");
  await shot("share_revoke.png");

  await page.goto(`${BASE}/shared/opens?token=${ids.share}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=share-opens-heading]");
  await shot("share_opens.png");

  await page.goto(`${BASE}/tree/living`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=living-tree-heading]");
  await shot("living_tree.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/tree`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=reunion-living-tree-heading]");
  await shot("reunion_tree.png");

  await page.goto(`${BASE}/stories/${ids.story}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=keep-out-story]");
  await shot("keep_out.png");

  await page.goto(`${BASE}/people/${ids.rose}/life`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=life-pdf-heading]");
  await shot("life_pdf.png");

  await page.goto(`${BASE}/map?voyageId=${ids.voyage}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=voyage-route]");
  await shot("voyage_route.png");

  await page.goto(`${BASE}/invites/researcher`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=researcher-heading]");
  await shot("researcher_invite.png");

  await page.goto(`${BASE}/clippings`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=clipping-page]");
  await shot("clipping_page.png");

  await page.goto(`${BASE}/ask/kept-out`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=kept-out-heading]");
  await shot("kept_out.png");

  await page.goto(`${BASE}/following/new`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=follow-feed-heading]");
  await shot("following_new.png");

  await page.goto(`${BASE}/reunions/${ids.reunion}/living`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-testid=reunion-living-heading]");
  await shot("reunion_living.png");

  await browser.close();
  writeFileSync(`${MEDIA}/follow_layer_manifest.txt`, written.join("\n") + "\n");
  console.log("ui follow layer ok", written.length, "files");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
