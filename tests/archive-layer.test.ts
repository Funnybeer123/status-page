import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

function daysFromToday(offset: number) {
  const now = new Date();
  const date = new Date(Date.UTC(1990, now.getUTCMonth(), now.getUTCDate() + offset));
  return date.toISOString().slice(0, 10);
}

test("a relative can record names, places, events, stories, sources, and find them again", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("archive-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker archive",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("add people the way a relative would", async () => {
    const soonBirthday = daysFromToday(4);
    const people = [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", notes: "Grandma. Worked the millinery counter." },
      { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", notes: "Grandpa. Bought a navy hatband." },
      { key: "helen", displayName: "Helen Park", givenName: "Helen", familyName: "Park", birthDate: "1954-09-19", notes: "Daughter of Rose and Louis." },
      { key: "nora", displayName: "Nora Park", givenName: "Nora", familyName: "Park", birthDate: soonBirthday, notes: "Keeps a secret diary at 14 Oak Street." },
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
    ]) {
      const created = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(link),
      });
      assert.equal(created.status, 200, created.body.error);
    }
  });

  await t.test("creating a person writes birth and death onto the timeline", async () => {
    const events = await maya.json<{ events: { kind: string; person: { id: string } }[] }>("/api/events");
    assert.equal(events.status, 200, events.body.error);
    assert.ok(events.body.events.some((event) => event.kind === "birth" && event.person.id === ids.rose));
    assert.ok(events.body.events.some((event) => event.kind === "death" && event.person.id === ids.rose));
    assert.ok(events.body.events.some((event) => event.kind === "marriage"));
  });

  await t.test("record a maiden name and a nickname", async () => {
    const maiden = await maya.json<{ name: { id: string; name: string; kind: string } }>("/api/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        kind: "maiden",
        name: "Rose Gable",
        startedAt: "1929-03-08",
        endedAt: "1953-05-01",
      }),
    });
    assert.equal(maiden.status, 200, maiden.body.error);
    ids.maiden = maiden.body.name.id;
    const nick = await maya.json("/api/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, kind: "nickname", name: "Rosie" }),
    });
    assert.equal(nick.status, 200, nick.body.error);
    const page = await maya.html(`/people/${ids.rose}`);
    assert.match(page.text, /Rose Gable/);
    assert.match(page.text, /Rosie/);
  });

  await t.test("record a place they lived", async () => {
    const home = await maya.json<{ residence: { id: string; place: { name: string } } }>("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        name: "Market Street rooms",
        locality: "Millinery block",
        region: "Iowa",
        country: "United States",
        startedAt: "1948-01-01",
        endedAt: "1954-09-01",
        notes: "Above the shop, two flights up.",
      }),
    });
    assert.equal(home.status, 200, home.body.error);
    assert.equal(home.body.residence.place.name, "Market Street rooms");
    const living = await maya.json("/api/residences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.nora,
        name: "14 Oak Street",
        locality: "Oak Street",
        region: "Iowa",
        startedAt: "2010-01-01",
        notes: "Nora's current house.",
      }),
    });
    assert.equal(living.status, 200, living.body.error);
    const page = await maya.html(`/people/${ids.rose}`);
    assert.match(page.text, /Market Street rooms/);
  });

  await t.test("add a life event beyond the automatic vitals", async () => {
    const event = await maya.json<{ event: { id: string; title: string } }>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        otherPersonId: ids.louis,
        kind: "other",
        title: "Millinery counter meeting",
        summary: "Louis bought a navy hatband and asked Rose to the picture show.",
        happenedOn: "1952-06-14",
        name: "Market Street millinery",
        locality: "Market Street",
        region: "Iowa",
      }),
    });
    assert.equal(event.status, 200, event.body.error);
    ids.event = event.body.event.id;
  });

  const letter = makeLetterPng();
  let letterId = "";

  await t.test("upload the letter a relative would keep", async () => {
    const save = new FormData();
    save.set("file", new Blob([letter.bytes], { type: "image/png" }), "rose-letter.png");
    save.set("title", "Aunt June on how Rose met Louis");
    save.set("writtenAt", "1952-06-14");
    save.set("kind", "letter");
    save.set("transcript", ROSE_LETTER);
    save.set("personIds", `${ids.rose},${ids.louis}`);
    const created = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: save });
    assert.equal(created.status, 200, created.body.error);
    letterId = created.body.document.id;
    ids.letter = letterId;
  });

  await t.test("cite the maiden name from that letter", async () => {
    const citation = await maya.json<{ citation: { id: string; claim: string } }>("/api/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "Rose's maiden name was Gable before she married Louis.",
        personId: ids.rose,
        nameId: ids.maiden,
        eventId: ids.event,
        documentId: letterId,
        pageNote: "Aunt June's letter, June 1952",
      }),
    });
    assert.equal(citation.status, 200, citation.body.error);
    const page = await maya.html(`/people/${ids.rose}`);
    assert.match(page.text, /maiden name was Gable/);
    assert.match(page.text, /Aunt June/);
  });

  await t.test("record an oral story that Ask can find", async () => {
    const story = await maya.json<{ story: { id: string; title: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "The felted navy brim",
        body: "Helen said Rose always kept the felted navy brim on a wooden block above the counter. That is the hat Louis first touched, and the family still calls it the beginning.",
        recordedAt: "2014-04-20",
        tellerPersonId: ids.helen,
        personIds: [ids.rose, ids.louis, ids.helen],
      }),
    });
    assert.equal(story.status, 200, story.body.error);
    ids.story = story.body.story.id;
    const page = await maya.html(`/stories/${ids.story}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /felted navy brim/);
    const list = await maya.html("/stories");
    assert.match(list.text, /The felted navy brim/);
  });

  await t.test("Ask answers from the oral story, not the Hart seed", async () => {
    const asked = await maya.json<{ answer: string; sources: { title: string }[] }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What did the family call the felted navy brim?" }),
    });
    assert.equal(asked.status, 200, asked.body.error);
    assert.match(asked.body.answer, /felted navy brim|wooden block|beginning/i);
    assert.doesNotMatch(asked.body.answer, /Eleanor Whitaker|Cedar Falls|Grange hall/);
    assert.ok(asked.body.sources.some((source) => /felted navy brim/i.test(source.title)));
  });

  await t.test("how are we related uses the tree she built", async () => {
    const related = await maya.json<{ related: { relation: string; sentence: string; found: boolean } }>(
      `/api/related?from=${ids.nora}&to=${ids.rose}`,
    );
    assert.equal(related.status, 200, related.body.error);
    assert.equal(related.body.related.found, true);
    assert.equal(related.body.related.relation, "grandchild");
    assert.match(related.body.related.sentence, /Nora Park is the grandchild of Rose Whitaker/);
    const page = await maya.html(`/related?from=${ids.nora}&to=${ids.rose}`);
    assert.match(page.text, /grandchild/);
    assert.match(page.text, /Nora Park/);
  });

  await t.test("archive-wide search finds names, places, stories, and letters", async () => {
    const maiden = await maya.json<{ hits: { kind: string; title: string }[] }>("/api/search?q=Gable");
    assert.ok(maiden.body.hits.some((hit) => hit.kind === "name" && /Gable/.test(hit.title)));
    const place = await maya.json<{ hits: { kind: string; title: string }[] }>("/api/search?q=Market%20Street");
    assert.ok(place.body.hits.some((hit) => /Market Street/.test(hit.title)));
    const story = await maya.json<{ hits: { kind: string; title: string }[] }>("/api/search?q=felted");
    assert.ok(story.body.hits.some((hit) => hit.kind === "story"));
    const letterHit = await maya.json<{ hits: { kind: string; title: string }[] }>("/api/search?q=millinery");
    assert.ok(letterHit.body.hits.some((hit) => hit.kind === "document" || hit.kind === "story"));
    const page = await maya.html("/search?q=felted");
    assert.match(page.text, /felted navy brim/i);
  });

  await t.test("timeline and dates reuse people, letters, and events", async () => {
    const timeline = await maya.json<{ entries: { title: string; source: string }[] }>("/api/timeline");
    assert.equal(timeline.status, 200, timeline.body.error);
    assert.ok(timeline.body.entries.some((entry) => /Millinery counter meeting/.test(entry.title)));
    assert.ok(timeline.body.entries.some((entry) => /Aunt June/.test(entry.title)));
    const page = await maya.html("/timeline");
    assert.match(page.text, /Millinery counter meeting/);
    const dates = await maya.json<{ upcoming: { title: string; daysUntil: number; hideYear: boolean }[] }>("/api/dates");
    assert.ok(dates.body.upcoming.some((item) => /Nora Park/.test(item.title) && item.daysUntil <= 7));
    const datesPage = await maya.html("/dates");
    assert.match(datesPage.text, /Nora Park/);
  });

  await t.test("a viewer cannot see living-person facts", async () => {
    const invite = await maya.json<{ token: string }>("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "viewer" }),
    });
    assert.equal(invite.status, 200, invite.body.error);
    const vera = new ApiClient();
    const veraEmail = uniqueEmail("archive-viewer");
    await vera.signup({ name: "Vera Viewer", email: veraEmail, password: PASSWORD, invite: invite.body.token });
    await vera.signIn(veraEmail, PASSWORD);

    const people = await vera.json<{ people: { id: string; displayName: string; birthDate: string | null; notes: string | null }[] }>("/api/people");
    const nora = people.body.people.find((person) => person.displayName === "Nora Park");
    const rose = people.body.people.find((person) => person.displayName === "Rose Whitaker");
    assert.ok(nora);
    assert.equal(nora.birthDate, null);
    assert.equal(nora.notes, null);
    assert.ok(rose?.birthDate);

    const person = await vera.json<{ person: { factsHidden: boolean; notes: string | null; residences: unknown[] } }>(`/api/people/${ids.nora}`);
    assert.equal(person.body.person.factsHidden, true);
    assert.equal(person.body.person.notes, null);
    assert.equal(person.body.person.residences.length, 0);

    const residences = await vera.json<{ residences: { person: { displayName: string } }[] }>("/api/residences");
    assert.ok(!residences.body.residences.some((item) => item.person.displayName === "Nora Park"));
    assert.ok(residences.body.residences.some((item) => item.person.displayName === "Rose Whitaker"));

    const search = await vera.json<{ hits: { excerpt: string; title: string }[] }>("/api/search?q=secret%20diary");
    assert.ok(!search.body.hits.some((hit) => /secret diary|Oak Street/i.test(`${hit.title} ${hit.excerpt}`)));

    const blocked = await vera.json("/api/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, kind: "aka", name: "Should fail" }),
    });
    assert.equal(blocked.status, 403);

    const noraPage = await vera.html(`/people/${ids.nora}`);
    assert.match(noraPage.text, /hidden because this person is living/);
    assert.doesNotMatch(noraPage.text, /14 Oak Street/);
    assert.doesNotMatch(noraPage.text, /secret diary/);

    const dates = await vera.json<{ upcoming: { title: string; hideYear: boolean; originalOn?: string }[] }>("/api/dates");
    const noraBirthday = dates.body.upcoming.find((item) => /Nora Park/.test(item.title));
    assert.ok(noraBirthday);
    assert.equal(noraBirthday.hideYear, true);
  });
});
