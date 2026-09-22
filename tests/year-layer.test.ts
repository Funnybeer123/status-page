import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can keep this year’s archive, assign work, and find a misspelled name", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("year-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker year",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("year-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
      { key: "june", displayName: "June Whitaker", birthDate: "1956-04-01" },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
      { key: "tom", displayName: "Tom Whitaker", birthDate: "1985-06-12" },
      { key: "agnes", displayName: "Agnes Whitaker", birthDate: "1926-04-08" },
      { key: "hugh", displayName: "Hugh Whitaker", birthDate: "1924-02-02", deathDate: "2026-03-01" },
      { key: "ivy", displayName: "Ivy Park", givenName: "Ivy", familyName: "Park", birthDate: "2026-01-15" },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
  });

  await t.test("this year in the family lists births, deaths, stories, and photographs", async () => {
    const story = await maya.json("/api/stories", {
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
    assert.equal(story.status, 200, story.body.error);
    const picnic = new FormData();
    picnic.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "reunion.svg");
    picnic.set("title", "Reunion picnic");
    picnic.set("capturedAt", "2026-07-04");
    picnic.set("personIds", ids.maya);
    const photo = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: picnic });
    assert.equal(photo.status, 200, photo.body.error);
    ids.photo = photo.body.asset.id;
    const event = await maya.json<{ event: { id: string } }>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.maya,
        kind: "reunion",
        title: "Hart reunion at the north farm",
        happenedOn: "2026-07-04",
      }),
    });
    assert.equal(event.status, 200, event.body.error);
    ids.reunion = event.body.event.id;
    const year = await maya.json<{ heading: string; items: { kind: string; title: string }[] }>("/api/year?year=2026");
    assert.equal(year.status, 200, year.body.error);
    assert.match(year.body.heading, /things from 2026|thing from 2026/);
    assert.ok(year.body.items.some((item) => item.kind === "birth" && item.title.includes("Ivy Park")));
    assert.ok(year.body.items.some((item) => item.kind === "death" && item.title.includes("Hugh Whitaker")));
    assert.ok(year.body.items.some((item) => item.kind === "story"));
    assert.ok(year.body.items.some((item) => item.kind === "photo"));
    const page = await maya.html("/year?year=2026");
    assert.match(page.text, /Ivy Park was born|Hugh Whitaker died|Sunday rolls from Maya|Reunion picnic/);
    const hidden = await viewer.json<{ items: { kind: string; title: string }[] }>("/api/year?year=2026");
    assert.equal(hidden.body.items.some((item) => item.title.includes("Ivy Park")), false);
    assert.ok(hidden.body.items.some((item) => item.title.includes("Hugh Whitaker")));
  });

  await t.test("a research task and a digitization item can be assigned to a relative", async () => {
    const task = await maya.json<{ task: { assignee?: { displayName: string } } }>("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Ask June who kept the millinery ledger",
        body: "Rose mentioned the counter book.",
        personId: ids.rose,
        assigneeId: ids.june,
      }),
    });
    assert.equal(task.status, 200, task.body.error);
    assert.equal(task.body.task.assignee?.displayName, "June Whitaker");
    const digitize = await maya.json<{ item: { assignee?: { displayName: string } } }>("/api/digitize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Helen’s class photo, still in the hall drawer",
        kind: "photo",
        holderId: ids.helen,
        assigneeId: ids.helen,
      }),
    });
    assert.equal(digitize.status, 200, digitize.body.error);
    assert.equal(digitize.body.item.assignee?.displayName, "Helen Park");
    const assigned = await maya.json<{ heading: string; tasks: { title: string }[] }>(`/api/assigned?personId=${ids.june}`);
    assert.match(assigned.body.heading, /assigned to June Whitaker/);
    assert.ok(assigned.body.tasks.some((row) => row.title.includes("millinery ledger")));
    const page = await maya.html(`/assigned?personId=${ids.june}`);
    assert.match(page.text, /Ask June who kept the millinery ledger/);
    const digitizePage = await maya.html("/digitize");
    assert.match(digitizePage.text, /assigned to Helen Park/);
  });

  await t.test("a misspelling still finds the person", async () => {
    const sounds = await maya.json<{ heading: string; people: { displayName: string }[] }>("/api/search/phonetic?q=Whiticker");
    assert.equal(sounds.status, 200, sounds.body.error);
    assert.ok(sounds.body.people.some((person) => person.displayName === "Rose Whitaker"));
    assert.match(sounds.body.heading, /sound like/);
    const page = await maya.html("/search/sounds?q=Whiticker");
    assert.match(page.text, /Rose Whitaker/);
    const search = await maya.json<{ hits: { title: string; excerpt: string }[] }>("/api/search?q=Whiticker");
    assert.ok(search.body.hits.some((hit) => hit.title === "Rose Whitaker" && /Sounds like/.test(hit.excerpt)));
  });

  await t.test("who lived in a home is listed year by year", async () => {
    const home = await maya.json<{ home: { id: string } }>("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Whitaker house", line: "14 Market Street", locality: "Cedar Falls" }),
    });
    assert.equal(home.status, 200, home.body.error);
    ids.home = home.body.home.id;
    await maya.json("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeId: ids.home, personId: ids.rose, startedOn: "1948-06-14", endedOn: "1950-12-31" }),
    });
    await maya.json("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeId: ids.home, personId: ids.louis, startedOn: "1949-01-01", endedOn: "1951-12-31" }),
    });
    const years = await maya.json<{
      heading: string;
      years: { year: number; people: { name: string }[] }[];
      gaps: number[];
    }>(`/api/homes/${ids.home}/years`);
    assert.match(years.body.heading, /Who lived at Whitaker house/);
    assert.ok(years.body.years.find((row) => row.year === 1948)?.people.some((person) => person.name === "Rose Whitaker"));
    assert.ok(years.body.years.find((row) => row.year === 1949)?.people.some((person) => person.name === "Louis Whitaker"));
    const page = await maya.html(`/homes/${ids.home}/years`);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Louis Whitaker/);
  });

  await t.test("a city-directory line keeps name, occupation, address, and year", async () => {
    const entry = await maya.json<{ entry: { name: string; year: number } }>("/api/directory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Whitaker, Rose",
        occupation: "milliner",
        address: "Above the millinery counter",
        year: 1950,
        personId: ids.rose,
      }),
    });
    assert.equal(entry.status, 200, entry.body.error);
    assert.equal(entry.body.entry.year, 1950);
    const page = await maya.html("/city-directory");
    assert.match(page.text, /Whitaker, Rose/);
    assert.match(page.text, /milliner/);
    assert.match(page.text, /1950/);
    const peopleDir = await maya.html("/directory");
    assert.match(peopleDir.text, /Family directory/);
    assert.match(peopleDir.text, /Maya Park/);
    const missing = await maya.html("/city-directory/missing");
    assert.match(missing.text, /Louis Whitaker|Helen Park/);
    const blocked = await viewer.json("/api/directory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nope", address: "Nowhere", year: 1950 }),
    });
    assert.equal(blocked.status, 403);
  });

  await t.test("a draft record is linked to military service", async () => {
    const service = await maya.json<{ record: { id: string } }>("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "military",
        personId: ids.louis,
        branch: "Army",
        unit: "Black Hawk County draft board",
        startedOn: "1944-09-22",
        endedOn: "1944-09-29",
      }),
    });
    assert.equal(service.status, 200, service.body.error);
    ids.service = service.body.record.id;
    const paper = await maya.json<{ paper: { kind: string } }>("/api/military/papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.louis,
        serviceId: ids.service,
        kind: "draft",
        year: 1944,
        numberNote: "Board card",
      }),
    });
    assert.equal(paper.status, 200, paper.body.error);
    assert.equal(paper.body.paper.kind, "draft");
    const page = await maya.html("/military/papers");
    assert.match(page.text, /Draft record · Louis Whitaker/);
    assert.match(page.text, /1944/);
  });

  await t.test("a school class list is linked to the school and the pupils", async () => {
    const row = await maya.json<{ class: { id: string; school: string } }>("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school: "Cedar Falls High",
        year: 1945,
        place: "Cedar Falls, Iowa",
        personIds: [ids.rose, ids.louis],
      }),
    });
    assert.equal(row.status, 200, row.body.error);
    ids.class = row.body.class.id;
    const list = await maya.html("/classes");
    assert.match(list.text, /Cedar Falls High, class of 1945/);
    assert.match(list.text, /Rose Whitaker/);
    const detail = await maya.html(`/classes/${ids.class}`);
    assert.match(detail.text, /Louis Whitaker/);
    const mates = await maya.html(`/classes/mates?personId=${ids.rose}`);
    assert.match(mates.text, /Louis Whitaker/);
  });

  await t.test("a living relative marks an event they attended", async () => {
    const claim = await maya.json("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.maya }),
    });
    assert.equal(claim.status, 200, claim.body.error);
    const there = await maya.json<{ attendance: { role: string } }>("/api/there", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ids.reunion }),
    });
    assert.equal(there.status, 200, there.body.error);
    assert.equal(there.body.attendance.role, "there");
    const dead = await maya.json("/api/there", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ids.reunion, personId: ids.rose }),
    });
    assert.equal(dead.status, 400);
    const page = await maya.html("/there");
    assert.match(page.text, /Maya Park was there/);
  });

  await t.test("a family banner hangs on the home page", async () => {
    const banner = await maya.json<{ bannerText: string }>("/api/banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bannerText: "The Whitakers of Cedar Falls",
        bannerNote: "She called the cider too sweet.",
      }),
    });
    assert.equal(banner.status, 200, banner.body.error);
    assert.equal(banner.body.bannerText, "The Whitakers of Cedar Falls");
    const home = await maya.html("/");
    assert.match(home.text, /The Whitakers of Cedar Falls/);
    assert.match(home.text, /She called the cider too sweet/);
    const blocked = await viewer.json("/api/banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bannerText: "Nope" }),
    });
    assert.equal(blocked.status, 403);
  });

  await t.test("start-here progress names what that relative still has not done", async () => {
    const photo = new FormData();
    photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "maya.svg");
    photo.set("title", "Maya at the picnic");
    photo.set("personIds", ids.maya);
    const uploaded = await maya.json("/api/assets", { method: "POST", body: photo });
    assert.equal(uploaded.status, 200, uploaded.body.error);
    const start = await maya.json<{ heading: string; steps: { id: string }[] }>("/api/start");
    assert.equal(start.body.steps.length, 3);
    assert.match(start.body.heading, /archive is yours/);
    const progress = await maya.json<{ heading: string; remaining: { id: string }[]; hasThere: boolean }>("/api/start/progress");
    assert.equal(progress.body.hasThere, true);
    assert.equal(progress.body.remaining.length, 0);
    assert.match(progress.body.heading, /Nothing left on the start list/);
    const page = await maya.html("/start/progress");
    assert.match(page.text, /Nothing left on the start list/);
  });

  await t.test("later pages keep the next useful year work together", async () => {
    const yearbook = await maya.html("/year/photos?year=2026");
    assert.match(yearbook.text, /Reunion picnic/);
    const suggest = await maya.html("/there/suggest");
    assert.equal(suggest.status, 200);
    const needed = await maya.html("/military/papers/needed");
    assert.equal(needed.status, 200);
    const letter = new FormData();
    letter.set("title", "June to Helen, millinery counter");
    letter.set("kind", "letter");
    letter.set("writtenAt", "1952-06-14");
    letter.set("transcript", ROSE_LETTER);
    letter.set("personIds", `${ids.rose},${ids.louis}`);
    const saved = await maya.json("/api/letters", { method: "POST", body: letter });
    assert.equal(saved.status, 200, saved.body.error);
    const blocked = await viewer.json("/api/there", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ids.reunion }),
    });
    assert.equal(blocked.status, 403);
  });
});
