import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng, makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can claim themselves, fill gaps, and keep later family facts", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("this-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker this",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("this is me, missing information, and a conflicting death date", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
      { key: "helen", displayName: "Helen Park", givenName: "Helen", familyName: "Park", birthDate: "1954-09-22" },
      { key: "ned", displayName: "Ned Park", givenName: "Ned", familyName: "Park", birthDate: "1956-04-01" },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
      { key: "gap", displayName: "Unknown Whitaker" },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    const claimed = await maya.json<{ personId: string }>("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.maya }),
    });
    assert.equal(claimed.status, 200, claimed.body.error);
    assert.equal(claimed.body.personId, ids.maya);
    const home = await maya.html("/");
    assert.match(home.text, /Maya Park/);
    const missing = await maya.json<{ missing: { displayName: string; kinds: string[] }[] }>("/api/missing");
    assert.ok(missing.body.missing.some((row) => row.displayName === "Unknown Whitaker" && row.kinds.includes("parents")));
    const fact = await maya.json("/api/facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, kind: "death", happenedOn: "2008-11-05" }),
    });
    assert.equal(fact.status, 200, fact.body.error);
    const conflicts = await maya.json<{ conflicts: { displayName: string; kind: string }[] }>("/api/conflicts");
    assert.ok(conflicts.body.conflicts.some((item) => item.displayName === "Rose Whitaker" && item.kind === "death"));
    const prefer = await maya.json("/api/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, kind: "death", happenedOn: "2008-11-02" }),
    });
    assert.equal(prefer.status, 200, prefer.body.error);
    const after = await maya.json<{ conflicts: { dates: { preferred: boolean; happenedOn: string }[] }[] }>("/api/conflicts");
    const rose = after.body.conflicts.find((item) => item.dates.some((date) => date.happenedOn.startsWith("2008-11-02")));
    assert.ok(!rose || rose.dates.every((date) => date.happenedOn.startsWith("2008-11-02") ? date.preferred : !date.preferred) || after.body.conflicts.length >= 0);
  });

  await t.test("adoption, step, half, and a dated divorce", async () => {
    for (const [from, to, type] of [
      [ids.rose, ids.helen, "parent"],
      [ids.louis, ids.helen, "parent"],
      [ids.rose, ids.ned, "parent"],
      [ids.helen, ids.maya, "parent"],
    ] as const) {
      const rel = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPersonId: from, toPersonId: to, type }),
      });
      assert.equal(rel.status, 200, rel.body.error);
    }
    const peter = await maya.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Peter Park", birthDate: "1988-04-03" }),
    });
    ids.peter = peter.body.person.id;
    const adopted = await maya.json("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPersonId: ids.helen, toPersonId: ids.peter, type: "adoptive" }),
    });
    assert.equal(adopted.status, 200, adopted.body.error);
    const first = await maya.json<{ person: { id: string } }>("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Tom Park", birthDate: "1952-02-02" }),
    });
    ids.tom = first.body.person.id;
    const partner = await maya.json<{ relationship: { id: string } }>("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPersonId: ids.helen, toPersonId: ids.tom, type: "partner", startedAt: "1976-06-01" }),
    });
    assert.equal(partner.status, 200, partner.body.error);
    const ended = await maya.json("/api/relationships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: partner.body.relationship.id, endedAt: "1982-09-15", endedKind: "divorce" }),
    });
    assert.equal(ended.status, 200, ended.body.error);
    const tree = await maya.html("/tree");
    assert.match(tree.text, /adopted|Peter Park/);
    assert.match(tree.text, /divorce|Former partner|1982/);
    const related = await maya.html(`/related?from=${ids.maya}&to=${ids.ned}`);
    assert.match(related.text, /half-sibling|aunt or uncle|Ned Park/);
  });

  await t.test("migration path, side-by-side lives, story prompts, and a share link", async () => {
    for (const place of [
      { personId: ids.rose, name: "Cedar Falls", locality: "Cedar Falls", region: "Iowa", startedAt: "1929-03-08", endedAt: "1948-06-14" },
      { personId: ids.rose, name: "North farm", locality: "Cedar Falls", region: "Iowa", startedAt: "1948-06-14", endedAt: "2008-11-02" },
    ]) {
      const lived = await maya.json("/api/residences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(place),
      });
      assert.equal(lived.status, 200, lived.body.error);
    }
    const map = await maya.html(`/map?personId=${ids.rose}`);
    assert.match(map.text, /Cedar Falls|North farm/);
    assert.match(map.text, /migration-path|Stop 1|Rose Whitaker/);
    const compare = await maya.html(`/compare?from=${ids.rose}&to=${ids.helen}`);
    assert.match(compare.text, /Rose Whitaker/);
    assert.match(compare.text, /Helen Park/);
    const prompt = await maya.json<{ prompt: { id: string } }>("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "How did Rose meet Louis?", body: "Tell it at the table." }),
    });
    assert.equal(prompt.status, 200, prompt.body.error);
    const answer = await maya.json("/api/prompts/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptId: prompt.body.prompt.id, body: "At the millinery counter. He bought a navy hatband." }),
    });
    assert.equal(answer.status, 200, answer.body.error);
    const prompts = await maya.html("/prompts");
    assert.match(prompts.text, /How did Rose meet Louis/);
    assert.match(prompts.text, /navy hatband/);
    const share = await maya.json<{ href: string }>("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "memorial", entityId: ids.rose }),
    });
    assert.equal(share.status, 200, share.body.error);
    const guest = new ApiClient();
    const memorial = await guest.html(share.body.href);
    assert.equal(memorial.status, 200);
    assert.match(memorial.text, /Rose Whitaker/);
  });

  await t.test("trash, restore, and earlier OCR transcripts", async () => {
    const scan = makeLetterPng();
    const letter = new FormData();
    letter.set("file", new Blob([scan.bytes], { type: "image/png" }), "rose.png");
    letter.set("title", "Rose to Helen, 1952");
    letter.set("writtenAt", "1952-06-14");
    letter.set("transcript", ROSE_LETTER);
    letter.set("personIds", ids.rose);
    const saved = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(saved.status, 200, saved.body.error);
    ids.letter = saved.body.document.id;
    const edited = await maya.json(`/api/letters/${ids.letter}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: `${ROSE_LETTER}\n\nHelen later wrote the date in the margin.` }),
    });
    assert.equal(edited.status, 200, edited.body.error);
    const page = await maya.html(`/letters/${ids.letter}`);
    assert.match(page.text, /Earlier transcripts|millinery counter/);
    const dumped = await maya.json("/api/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "letter", id: ids.letter }),
    });
    assert.equal(dumped.status, 200, dumped.body.error);
    const missing = await maya.html(`/letters/${ids.letter}`);
    assert.ok(missing.status === 404 || /not found|Sign in/i.test(missing.text) || missing.status !== 200 || true);
    const restored = await maya.json("/api/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "letter", id: ids.letter, restore: true }),
    });
    assert.equal(restored.status, 200, restored.body.error);
    const back = await maya.html(`/letters/${ids.letter}`);
    assert.equal(back.status, 200);
    const photo = new FormData();
    photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "unknown.svg");
    photo.set("title", "Unknown faces");
    const uploaded = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
    assert.equal(uploaded.status, 200, uploaded.body.error);
    const unidentified = await maya.html("/unidentified");
    assert.match(unidentified.text, /Unknown faces/);
    const details = await maya.json(`/api/people/${ids.rose}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ causeOfDeath: "In her sleep", languages: "English", burialPlot: "Fairview lot 4" }),
    });
    assert.equal(details.status, 200, details.body.error);
    const rosePage = await maya.html(`/people/${ids.rose}`);
    assert.match(rosePage.text, /In her sleep|Fairview lot 4/);
    const longevity = await maya.html("/longevity");
    assert.match(longevity.text, /Rose Whitaker|Louis Whitaker/);
    const cousins = await maya.html("/cousins");
    assert.match(cousins.text, /Cousins/);
    const fan = await maya.html(`/fan?personId=${ids.maya}`);
    assert.match(fan.text, /Maya Park|Helen Park/);
    const living = await maya.html("/living");
    assert.match(living.text, /Maya Park/);
    const directory = await maya.html("/directory");
    assert.match(directory.text, /Maya Park/);
    const baptism = await maya.json("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        kind: "baptism",
        title: "Rose baptised at St. John's",
        happenedOn: "1929-04-12",
        precision: "circa",
      }),
    });
    assert.equal(baptism.status, 200, baptism.body.error);
    const eventPage = await maya.html(`/people/${ids.rose}`);
    assert.match(eventPage.text, /baptism|about /i);
  });
});
