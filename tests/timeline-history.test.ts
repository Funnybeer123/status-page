import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng, makePhotoSvg, makeVideo } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("the family history lists every kind of fact a relative entered, with filters and gaps", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("history-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker history",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("add three generations the way a relative would", async () => {
    const people = [
      { key: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
      { key: "helen", displayName: "Helen Park", birthDate: "1954-09-19" },
      { key: "nora", displayName: "Nora Park", birthDate: "1983-01-30" },
      { key: "ada", displayName: "Ada Cousin" },
    ];
    for (const person of people) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    for (const link of [
      { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" },
      { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.helen, toPersonId: ids.nora, type: "parent" },
      { fromPersonId: ids.ada, toPersonId: ids.helen, type: "partner" },
    ]) {
      const created = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(link),
      });
      assert.equal(created.status, 200, created.body.error);
    }
  });

  await t.test("record a move, a photo, a film, a letter, a note, and a story", async () => {
    const home = await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        name: "Market Street rooms",
        locality: "Millinery block",
        startedAt: "1948-01-01",
        endedAt: "1954-09-01",
      }),
    });
    assert.equal(home.status, 200, home.body.error);

    const photo = new FormData();
    photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "market.svg");
    photo.set("title", "Market Street shop window");
    photo.set("capturedAt", "1952-06-14");
    photo.set("personIds", `${ids.rose},${ids.louis}`);
    const uploadedPhoto = await maya.json("/api/assets", { method: "POST", body: photo });
    assert.equal(uploadedPhoto.status, 200, uploadedPhoto.body.error);

    const video = makeVideo();
    const reel = new FormData();
    reel.set("file", new Blob([video.bytes], { type: "video/mp4" }), "reunion.mp4");
    reel.set("title", "Family reunion reel");
    reel.set("capturedAt", "1964-07-04");
    reel.set("kind", "video");
    reel.set("personIds", ids.helen);
    const uploadedVideo = await maya.json("/api/assets", { method: "POST", body: reel });
    assert.equal(uploadedVideo.status, 200, uploadedVideo.body.error);

    const scan = makeLetterPng();
    const letter = new FormData();
    letter.set("file", new Blob([scan.bytes], { type: "image/png" }), "rose-letter.png");
    letter.set("title", "Aunt June on how Rose met Louis");
    letter.set("writtenAt", "1952-06-14");
    letter.set("transcript", ROSE_LETTER);
    letter.set("personIds", `${ids.rose},${ids.louis}`);
    const savedLetter = await maya.json("/api/letters", { method: "POST", body: letter });
    assert.equal(savedLetter.status, 200, savedLetter.body.error);

    const note = new FormData();
    note.set("title", "Helen on the navy brim");
    note.set("kind", "note");
    note.set("writtenAt", "2014-04-20");
    note.set("transcript", "Helen said the felted navy brim stayed on the wooden block.");
    note.set("personIds", `${ids.helen},${ids.rose}`);
    const savedNote = await maya.json("/api/letters", { method: "POST", body: note });
    assert.equal(savedNote.status, 200, savedNote.body.error);

    const story = await maya.json("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "The felted navy brim",
        body: "Rose always kept the felted navy brim on a wooden block above the counter.",
        recordedAt: "2014-04-20",
        tellerPersonId: ids.helen,
        personIds: [ids.rose, ids.helen],
      }),
    });
    assert.equal(story.status, 200, story.body.error);
  });

  await t.test("the history is in date order and includes every source", async () => {
    const history = await maya.json<{
      entries: { title: string; source: string; happenedOn: string | null; kind: string }[];
      gaps: { years: number; after: string; before: string; title: string }[];
      missing: { kind: string; title: string }[];
      counts: { photos: number; videos: number; letters: number; stories: number; events: number; notes: number };
      generations: { generation: number; label: string }[];
    }>("/api/timeline");
    assert.equal(history.status, 200, history.body.error);
    const titles = history.body.entries.map((entry) => entry.title);
    assert.ok(titles.some((title) => /Rose Whitaker born/.test(title)));
    assert.ok(titles.some((title) => /Lived in Market Street rooms|Moved to Market Street/.test(title)));
    assert.ok(titles.some((title) => /married/.test(title)));
    assert.ok(titles.some((title) => /Aunt June/.test(title)));
    assert.ok(titles.some((title) => /Market Street shop window/.test(title)));
    assert.ok(titles.some((title) => /Family reunion reel/.test(title)));
    assert.ok(titles.some((title) => /felted navy brim/.test(title)));
    assert.ok(titles.some((title) => /Helen on the navy brim/.test(title)));
    assert.ok(history.body.counts.photos >= 1);
    assert.ok(history.body.counts.videos >= 1);
    assert.ok(history.body.counts.letters >= 1);
    assert.ok(history.body.counts.stories >= 1);
    assert.ok(history.body.counts.notes >= 1);

    const dated = history.body.entries.filter((entry) => entry.happenedOn);
    const dates = dated.map((entry) => entry.happenedOn as string);
    assert.deepEqual(dates, [...dates].sort());

    assert.ok(history.body.gaps.some((gap) => gap.after.startsWith("1929") && gap.before.startsWith("1948") && gap.years >= 18));
    assert.ok(history.body.missing.some((item) => item.kind === "birth" && /Ada Cousin/.test(item.title)));
    assert.ok(history.body.missing.some((item) => item.kind === "marriage" && /Ada Cousin/.test(item.title)));
    assert.ok(history.body.generations.length >= 3);
  });

  await t.test("person and generation filters narrow the history", async () => {
    const nora = await maya.json<{ entries: { title: string; people: { id: string }[] }[] }>(
      `/api/timeline?personId=${ids.nora}`,
    );
    assert.ok(nora.body.entries.length);
    assert.ok(nora.body.entries.every((entry) => entry.people.some((person) => person.id === ids.nora)));
    assert.ok(!nora.body.entries.some((entry) => /Aunt June/.test(entry.title)));

    const gen0 = await maya.json<{ entries: { generations: number[]; title: string }[] }>("/api/timeline?generation=0");
    assert.ok(gen0.body.entries.length);
    assert.ok(gen0.body.entries.every((entry) => entry.generations.includes(0)));
    assert.ok(gen0.body.entries.some((entry) => /Rose Whitaker born|Louis Whitaker born/.test(entry.title)));
  });

  await t.test("a missing event added from the timeline appears in order", async () => {
    const created = await maya.json<{ event: { id: string; title: string } }>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        kind: "other",
        title: "War-time millinery night shift",
        summary: "Rose stayed after closing to finish navy bands for the depot.",
        happenedOn: "1943-11-11",
        name: "Market Street millinery",
      }),
    });
    assert.equal(created.status, 200, created.body.error);
    const history = await maya.json<{
      entries: { title: string; happenedOn: string | null }[];
    }>("/api/timeline");
    const added = history.body.entries.find((entry) => /night shift/.test(entry.title));
    assert.ok(added);
    assert.equal(added.happenedOn, "1943-11-11");
    const dated = history.body.entries.filter((entry) => entry.happenedOn).map((entry) => entry.happenedOn as string);
    const index = dated.indexOf("1943-11-11");
    assert.ok(index > 0);
    assert.ok(dated[index - 1] <= "1943-11-11");
    assert.ok(dated[index + 1] >= "1943-11-11");
  });

  await t.test("the history page shows filters, a gap, the add form, and the new event", async () => {
    const page = await maya.html("/timeline");
    assert.equal(page.status, 200);
    assert.match(page.text, /Family history/);
    assert.match(page.text, /All generations/);
    assert.match(page.text, /Generation 1/);
    assert.match(page.text, /unrecorded years/);
    assert.match(page.text, /Add a missing event/);
    assert.match(page.text, /War-time millinery night shift/);
    assert.match(page.text, /Still missing/);
    assert.match(page.text, /Ada Cousin/);
    const filtered = await maya.html(`/timeline?personId=${ids.rose}`);
    assert.match(filtered.text, /Rose Whitaker/);
    assert.match(filtered.text, /night shift/);
  });
});
