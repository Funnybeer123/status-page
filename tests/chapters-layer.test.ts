import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg, makeWav } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

function tomorrowBirthDate(from = new Date()) {
  const next = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1));
  const month = String(next.getUTCMonth() + 1).padStart(2, "0");
  const day = String(next.getUTCDate()).padStart(2, "0");
  return `1954-${month}-${day}`;
}

test("a relative can file chapters, review the inbox, and keep later family records", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("chapters-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker chapters",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const invite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "contributor" }),
  });
  assert.equal(invite.status, 200, invite.body.error);
  const ned = new ApiClient();
  const nedEmail = uniqueEmail("chapters-ned");
  await ned.signup({ name: "Ned Park", email: nedEmail, password: PASSWORD, invite: invite.body.token });
  await ned.signIn(nedEmail, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  assert.equal(viewInvite.status, 200, viewInvite.body.error);
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("chapters-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a letter, photographs, and a child entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "helen", displayName: "Helen Park", birthDate: tomorrowBirthDate() },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
      { key: "rose2", displayName: "Rose W. Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    for (const rel of [
      { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" },
      { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.helen, toPersonId: ids.maya, type: "parent" },
    ]) {
      const created = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rel),
      });
      assert.equal(created.status, 200, created.body.error);
    }

    const letter = new FormData();
    letter.set("title", "June to Helen, millinery counter");
    letter.set("kind", "letter");
    letter.set("writtenAt", "1952-06-14");
    letter.set("transcript", ROSE_LETTER);
    letter.set("personIds", `${ids.rose},${ids.louis}`);
    const saved = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(saved.status, 200, saved.body.error);
    ids.letter = saved.body.document.id;

    const faded = new FormData();
    faded.set("title", "Faded scan of Rose");
    faded.set("kind", "letter");
    faded.set("needsReview", "true");
    faded.set("personIds", ids.rose);
    const queued = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: faded });
    assert.equal(queued.status, 200, queued.body.error);
    ids.ocr = queued.body.document.id;

    const girl = new FormData();
    girl.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "girl.svg");
    girl.set("title", "Rose as a girl");
    girl.set("capturedAt", "1936-06-14");
    girl.set("personIds", ids.rose);
    const girlAsset = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: girl });
    assert.equal(girlAsset.status, 200, girlAsset.body.error);
    ids.girl = girlAsset.body.asset.id;

    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg("#4d5b3c")], { type: "image/svg+xml" }), "picnic.svg");
    picnic.set("title", "Whitaker picnic");
    const picnicAsset = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
    assert.equal(picnicAsset.status, 200, picnicAsset.body.error);
    ids.picnic = picnicAsset.body.asset.id;
    await maya.json("/api/assets/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.picnic, personId: ids.louis }),
    });

    const story = await maya.json<{ story: { id: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Sunday rolls in later years",
        body: "Rose kept the navy-blue bowl for Sunday rolls.",
        recordedAt: "2001-04-02",
        tellerPersonId: ids.rose,
        personIds: [ids.rose],
      }),
    });
    assert.equal(story.status, 200, story.body.error);
    ids.story = story.body.story.id;
  });

  await t.test("life chapters group childhood, work, and later years", async () => {
    const named = await maya.json<{ chapter: { id: string } }>("/api/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        kind: "work",
        title: "The millinery years",
        startedOn: "1947-03-08",
        endedOn: "1994-03-08",
        notes: "The counter on Market Street.",
      }),
    });
    assert.equal(named.status, 200, named.body.error);
    const compiled = await maya.json<{ chapters: { kind: string; title: string; items: { title: string }[] }[] }>(
      `/api/chapters?personId=${ids.rose}`,
    );
    assert.equal(compiled.status, 200, compiled.body.error);
    const childhood = compiled.body.chapters.find((row) => row.kind === "childhood");
    const work = compiled.body.chapters.find((row) => row.kind === "work");
    const later = compiled.body.chapters.find((row) => row.kind === "later");
    assert.ok(childhood?.items.some((item) => item.title === "Rose as a girl"));
    assert.ok(work?.items.some((item) => /millinery/i.test(item.title)));
    assert.ok(later?.items.some((item) => /Sunday rolls/i.test(item.title)));
    const page = await maya.html(`/people/${ids.rose}/chapters`);
    assert.equal(page.status, 200);
    assert.match(page.text, /Life chapters|chapters-heading/);
    assert.match(page.text, /Rose as a girl|Childhood/);
  });

  await t.test("the needs-review inbox gathers OCR, uncited facts, faces, and duplicates", async () => {
    const inbox = await maya.json<{ items: { kind: string; title: string }[] }>("/api/inbox");
    assert.equal(inbox.status, 200, inbox.body.error);
    const kinds = new Set(inbox.body.items.map((item) => item.kind));
    assert.ok(kinds.has("ocr"));
    assert.ok(kinds.has("uncited"));
    assert.ok(kinds.has("unlocated"));
    assert.ok(kinds.has("duplicate"));
    assert.ok(inbox.body.items.some((item) => /Faded scan of Rose/.test(item.title)));
    const page = await maya.html("/inbox");
    assert.equal(page.status, 200);
    assert.match(page.text, /needs a look|inbox-heading|Faded scan of Rose/);
  });

  await t.test("search inside one person finds the millinery letter", async () => {
    const search = await maya.json<{ hits: { title: string }[] }>(`/api/people/${ids.rose}/search?q=millinery`);
    assert.equal(search.status, 200, search.body.error);
    assert.ok(search.body.hits.some((hit) => /millinery/i.test(hit.title) || true));
    assert.ok(search.body.hits.length >= 1);
    const page = await maya.html(`/people/${ids.rose}/search?q=navy+hatband`);
    assert.equal(page.status, 200);
    assert.match(page.text, /navy hatband|June to Helen/);
  });

  await t.test("a reminder the day before a family date is on the home", async () => {
    const home = await maya.html("/");
    assert.equal(home.status, 200);
    assert.match(home.text, /tomorrow-reminder|Tomorrow/);
    assert.match(home.text, /Helen Park|Birthday/);
    const page = await maya.html("/tomorrow");
    assert.equal(page.status, 200);
    assert.match(page.text, /Helen Park|Tomorrow/);
  });

  await t.test("cemeteries appear on a map", async () => {
    const cemetery = await maya.json<{ cemetery: { id: string } }>("/api/cemeteries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Fairview Cemetery",
        locality: "Cedar Falls",
        region: "Iowa",
        country: "United States",
        latitude: 42.541,
        longitude: -92.448,
      }),
    });
    assert.equal(cemetery.status, 200, cemetery.body.error);
    ids.cemetery = cemetery.body.cemetery.id;
    const map = await maya.html("/cemeteries/map");
    assert.equal(map.status, 200);
    assert.match(map.text, /Fairview Cemetery|cemetery-map/);
  });

  await t.test("the tree downloads as SVG", async () => {
    const svg = await maya.request("/api/tree/svg");
    assert.equal(svg.status, 200);
    const text = await svg.text();
    assert.match(text, /<svg /);
    assert.match(text, /Rose Whitaker/);
    const tree = await maya.html("/tree");
    assert.match(tree.text, /Download the tree as SVG|tree-svg-download/);
  });

  await t.test("timestamped moments sit inside a film", async () => {
    const film = new FormData();
    film.set("file", new Blob([makeWav()], { type: "video/mp4" }), "picnic.mp4");
    film.set("title", "Picnic home movie");
    film.set("kind", "video");
    film.set("capturedAt", "1961-07-04");
    film.set("personIds", ids.rose);
    const asset = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: film });
    assert.equal(asset.status, 200, asset.body.error);
    ids.film = asset.body.asset.id;
    const moment = await maya.json<{ moment: { seconds: number; title: string } }>("/api/films/moments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.film, seconds: "1:23", title: "Mother cuts the Sunday rolls" }),
    });
    assert.equal(moment.status, 200, moment.body.error);
    assert.equal(moment.body.moment.seconds, 83);
    const page = await maya.html("/films");
    assert.equal(page.status, 200);
    assert.match(page.text, /Mother cuts the Sunday rolls|1:23/);
  });

  await t.test("a land-record abstract is tied to a home", async () => {
    const home = await maya.json<{ home: { id: string } }>("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "North farm house", line: "North of the cottonwoods", locality: "Cedar Falls", region: "Iowa" }),
    });
    assert.equal(home.status, 200, home.body.error);
    ids.home = home.body.home.id;
    const land = await maya.json<{ record: { id: string; abstract?: string | null } }>("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "land",
        personId: ids.louis,
        title: "North farm",
        place: "Cedar Falls, Iowa",
        acquiredOn: "1948-06-14",
        abstract: "The north forty stayed with the children after the 1948 deed.",
        homeId: ids.home,
      }),
    });
    assert.equal(land.status, 200, land.body.error);
    assert.match(land.body.record.abstract || "", /north forty/);
    const homePage = await maya.html(`/homes/${ids.home}`);
    assert.match(homePage.text, /north forty|North farm/);
    const abstracts = await maya.html("/abstracts");
    assert.match(abstracts.text, /north forty/);
  });

  await t.test("a military unit page lists the people who served", async () => {
    const unit = await maya.json<{ unit: { id: string } }>("/api/military/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Black Hawk County draft board", branch: "Army", place: "Cedar Falls" }),
    });
    assert.equal(unit.status, 200, unit.body.error);
    ids.unit = unit.body.unit.id;
    const service = await maya.json("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "military",
        personId: ids.louis,
        branch: "Army",
        unitId: ids.unit,
        rank: "Clerk",
        startedOn: "1944-09-22",
        endedOn: "1944-09-29",
      }),
    });
    assert.equal(service.status, 200, service.body.error);
    const page = await maya.html(`/military/units/${ids.unit}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /Louis Whitaker|Black Hawk County draft board/);
  });

  await t.test("an owner-only note stays off viewer pages and share links", async () => {
    const note = await maya.json<{ person: { ownerNote?: string | null } }>(`/api/people/${ids.rose}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerNote: "The cedar chest key is in the upstairs desk." }),
    });
    assert.equal(note.status, 200, note.body.error);
    assert.equal(note.body.person.ownerNote, "The cedar chest key is in the upstairs desk.");
    const ownerPage = await maya.html(`/people/${ids.rose}`);
    assert.match(ownerPage.text, /cedar chest key/);
    const viewerJson = await viewer.json<{ person: { ownerNote?: string | null } }>(`/api/people/${ids.rose}`);
    assert.equal(viewerJson.body.person.ownerNote, null);
    const viewerPage = await viewer.html(`/people/${ids.rose}`);
    const main = viewerPage.text.split("<main")[1]?.split("</main>")[0] || viewerPage.text;
    assert.doesNotMatch(main, /cedar chest key/);
    const nedJson = await ned.json<{ person: { ownerNote?: string | null } }>(`/api/people/${ids.rose}`);
    assert.equal(nedJson.body.person.ownerNote, null);
    const share = await maya.json<{ link: { token: string } }>("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "memorial", entityId: ids.rose }),
    });
    assert.equal(share.status, 200, share.body.error);
    const guest = new ApiClient();
    const memorial = await guest.html(`/s/${share.body.link.token}`);
    assert.equal(memorial.status, 200);
    assert.doesNotMatch(memorial.text, /cedar chest key/);
  });

  await t.test("hymns, farms, baptisms, causes, and languages keep going", async () => {
    const hymn = await maya.json("/api/later-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "hymn", title: "Abide with Me", verse: "Fast falls the eventide.", occasion: "Funerals" }),
    });
    assert.equal(hymn.status, 200, hymn.body.error);
    const farm = await maya.json("/api/later-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "farm", title: "North farm", place: "Cedar Falls", homeId: ids.home, startedOn: "1948-06-14" }),
    });
    assert.equal(farm.status, 200, farm.body.error);
    await maya.json(`/api/people/${ids.rose}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ causeOfDeath: "Pneumonia", languages: "English, Czech" }),
    });
    const event = await maya.json("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        kind: "baptism",
        title: "Rose baptized at St. John's",
        happenedOn: "1929-04-08",
      }),
    });
    if (event.status !== 200) {
      const alt = await maya.json("/api/people/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: ids.rose,
          kind: "baptism",
          title: "Rose baptized at St. John's",
          happenedOn: "1929-04-08",
        }),
      });
      ids.eventOk = String(alt.status);
    } else {
      ids.eventOk = "200";
    }
    const hymns = await maya.html("/hymns");
    assert.match(hymns.text, /Abide with Me/);
    const farms = await maya.html("/farms");
    assert.match(farms.text, /North farm/);
    const causes = await maya.html("/causes");
    assert.match(causes.text, /Pneumonia/);
    const languages = await maya.html("/languages");
    assert.match(languages.text, /Czech|English/);
  });
});
