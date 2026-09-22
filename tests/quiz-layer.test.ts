import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg, makeWav } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can quiz a grandchild, transcribe a reel, and keep later family records", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("quiz-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker quiz",
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
  const nedEmail = uniqueEmail("quiz-ned");
  await ned.signup({ name: "Ned Park", email: nedEmail, password: PASSWORD, invite: invite.body.token });
  await ned.signIn(nedEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a letter, a reply, and a photograph entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
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
    const wedding = await maya.json<{ event: { id: string } }>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        otherPersonId: ids.louis,
        kind: "marriage",
        title: "Rose and Louis married",
        happenedOn: "1953-09-22",
        name: "St. John's",
        locality: "Cedar Falls",
      }),
    });
    assert.equal(wedding.status, 200, wedding.body.error);
    ids.wedding = wedding.body.event.id;

    const letter = new FormData();
    letter.set("title", "June to Helen, millinery counter");
    letter.set("kind", "letter");
    letter.set("writtenAt", "1952-06-14");
    letter.set("transcript", ROSE_LETTER);
    letter.set("personIds", `${ids.rose},${ids.louis}`);
    const saved = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(saved.status, 200, saved.body.error);
    ids.letter = saved.body.document.id;

    const reply = new FormData();
    reply.set("title", "Helen’s reply about the hatband");
    reply.set("kind", "letter");
    reply.set("writtenAt", "1952-07-01");
    reply.set("transcript", "Helen kept the navy hatband in the cedar chest and still talks about the millinery counter.");
    reply.set("personIds", `${ids.rose},${ids.helen}`);
    reply.set("replyToId", ids.letter);
    const answered = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: reply });
    assert.equal(answered.status, 200, answered.body.error);
    ids.reply = answered.body.document.id;

    const living = new FormData();
    living.set("title", "Maya’s current shop number");
    living.set("kind", "letter");
    living.set("writtenAt", "2024-03-08");
    living.set("transcript", "Maya Park lives at 9 Oak Street and answers the shop phone every morning.");
    living.set("personIds", ids.maya);
    const livingLetter = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: living });
    assert.equal(livingLetter.status, 200, livingLetter.body.error);
    ids.livingLetter = livingLetter.body.document.id;

    const photo = new FormData();
    photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "counter.svg");
    photo.set("title", "Rose at the millinery counter");
    const asset = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
    assert.equal(asset.status, 200, asset.body.error);
    ids.photo = asset.body.asset.id;
    await maya.json("/api/assets/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.photo, personId: ids.rose }),
    });
  });

  await t.test("grandchild quiz cites letters and hides living-only sources", async () => {
    const quiz = await maya.json<{ questions: { question: string; answer: string; href: string; sourceTitle: string }[] }>("/api/quiz");
    assert.equal(quiz.status, 200, quiz.body.error);
    assert.ok(quiz.body.questions.some((item) => /meet|hatband|millinery|June/i.test(`${item.question} ${item.answer}`)));
    assert.ok(quiz.body.questions.some((item) => item.href === `/letters/${ids.letter}`));
    assert.ok(!quiz.body.questions.some((item) => item.href === `/letters/${ids.livingLetter}`));
    assert.ok(!quiz.body.questions.some((item) => /Oak Street|shop phone/.test(`${item.question} ${item.answer}`)));
    const page = await maya.html("/quiz");
    assert.match(page.text, /quiz-heading|Family quiz/);
    assert.match(page.text, /millinery|hatband|meet/i);
  });

  await t.test("a relative transcribes oral history so Ask can use it", async () => {
    const oral = new FormData();
    oral.set("file", new Blob([makeWav()], { type: "audio/wav" }), "helen.wav");
    oral.set("title", "Helen on the picnic reel");
    oral.set("kind", "audio");
    const asset = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: oral });
    assert.equal(asset.status, 200, asset.body.error);
    ids.oral = asset.body.asset.id;
    const transcribed = await maya.json<{ document: { id: string; transcript: string } }>("/api/oral/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: ids.oral,
        title: "Picnic reel, Helen speaking",
        personId: ids.rose,
        transcript:
          "Helen speaking over the picnic reel. Mother is cutting Sunday rolls under the cottonwoods. The children keep asking how Grandma met Grandpa at the millinery counter.",
      }),
    });
    assert.equal(transcribed.status, 200, transcribed.body.error);
    ids.oralDoc = transcribed.body.document.id;
    const asked = await maya.json<{
      answer: string;
      sources: { documentId: string; title: string; excerpt: string }[];
    }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What did Helen say about Sunday rolls on the picnic reel?" }),
    });
    assert.equal(asked.status, 200, asked.body.error);
    assert.ok(asked.body.sources.some((source) => source.documentId === ids.oralDoc));
    assert.match(`${asked.body.answer} ${asked.body.sources.map((source) => source.excerpt).join(" ")}`, /Sunday rolls|cottonwoods|picnic reel/i);
    const page = await maya.html("/oral");
    assert.match(page.text, /Sunday rolls/);
    assert.match(page.text, /oral-transcript|Picnic reel/);
  });

  await t.test("a map of where photographs were taken, separate from residences", async () => {
    const placed = await maya.json<{ place: { id: string; name: string } }>("/api/photos/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: ids.photo,
        name: "Grange hall",
        locality: "Cedar Falls",
        region: "Iowa",
      }),
    });
    assert.equal(placed.status, 200, placed.body.error);
    ids.photoPlace = placed.body.place.id;
    const page = await maya.html("/map/photos");
    assert.match(page.text, /photo-map-heading|photographs were taken/i);
    assert.match(page.text, /Rose at the millinery counter/);
    assert.match(page.text, /Grange hall/);
    const lived = await maya.html("/map");
    assert.match(lived.text, /Places they lived|Where photographs were taken/);
    const unplaced = await maya.html("/photos/unplaced");
    assert.doesNotMatch(unplaced.text, /Rose at the millinery counter/);
  });

  await t.test("letter reading room shows the thread as a conversation", async () => {
    const page = await maya.html(`/letters/${ids.reply}/room`);
    assert.match(page.text, /reading-room-heading|reading-room/);
    assert.match(page.text, /June to Helen/);
    assert.match(page.text, /Helen’s reply/);
    assert.match(page.text, /reading-turn-left/);
    assert.match(page.text, /reading-turn-right/);
    const letter = await maya.html(`/letters/${ids.letter}`);
    assert.match(letter.text, /reading-room-link|Open the reading room/);
    const inventory = await maya.html("/inventory");
    assert.match(inventory.text, /June to Helen/);
    assert.match(inventory.text, /reply/i);
  });

  await t.test("merge duplicate places and keep the photograph on the place that remains", async () => {
    const extra = await maya.json<{ event: { placeId?: string; place?: { id: string } } }>("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.louis,
        kind: "residence",
        title: "Louis at the Grange Hall spelling",
        happenedOn: "1948-01-01",
        name: "Grange Hall",
        locality: "Cedar Falls",
      }),
    });
    assert.equal(extra.status, 200, extra.body.error);
    const placesPage = await maya.html("/places");
    assert.match(placesPage.text, /place-duplicates|looks like/i);
    const dropId = extra.body.event.place?.id || extra.body.event.placeId;
    assert.ok(dropId);
    const merged = await maya.json<{ place: { id: string; name: string } }>("/api/places/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId: ids.photoPlace, dropId }),
    });
    assert.equal(merged.status, 200, merged.body.error);
    assert.equal(merged.body.place.id, ids.photoPlace);
    const after = await maya.html("/places");
    assert.doesNotMatch(after.text, /Louis at the Grange Hall spelling[\s\S]*Grange Hall(?! hall)/);
    const kept = await maya.html(`/places/${ids.photoPlace}`);
    assert.match(kept.text, /Rose at the millinery counter|Photographs taken here|Grange hall/i);
  });

  await t.test("citation worksheets for a census, a birth, and a death", async () => {
    const census = await maya.json<{ citation: { id: string; kind: string; claim: string }; event: { id: string; kind: string } }>("/api/worksheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "census",
        personId: ids.rose,
        year: "1950",
        place: "Cedar Falls",
        detail: "ED 7-12, sheet 4",
        documentId: ids.letter,
      }),
    });
    assert.equal(census.status, 200, census.body.error);
    assert.equal(census.body.citation.kind, "census");
    assert.match(census.body.citation.claim, /Rose Whitaker was counted in 1950/);
    const birth = await maya.json<{ citation: { kind: string }; event: { id: string; kind: string } }>("/api/worksheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "birth",
        personId: ids.rose,
        year: "1929-03-08",
        place: "Cedar Falls",
        documentId: ids.letter,
      }),
    });
    assert.equal(birth.status, 200, birth.body.error);
    assert.equal(birth.body.event.kind, "birth");
    const death = await maya.json<{ citation: { kind: string } }>("/api/worksheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "death",
        personId: ids.rose,
        year: "2008-11-02",
        place: "Cedar Falls",
        documentId: ids.letter,
      }),
    });
    assert.equal(death.status, 200, death.body.error);
    const list = await maya.json<{ citations: { kind: string; claim: string }[] }>("/api/worksheets");
    assert.ok(list.body.citations.some((row) => row.kind === "census"));
    assert.ok(list.body.citations.some((row) => row.kind === "birth"));
    assert.ok(list.body.citations.some((row) => row.kind === "death"));
    const page = await maya.html("/worksheets");
    assert.match(page.text, /census-worksheet|Citation worksheets/);
    assert.match(page.text, /Rose Whitaker was counted/);
  });

  await t.test("guestbook on a memorial", async () => {
    const note = await ned.json<{ comment: { id: string } }>("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        body: "I still think of Rose whenever the millinery letter comes out of the drawer.",
      }),
    });
    assert.equal(note.status, 200, note.body.error);
    const comments = await maya.json<{ comments: { body: string; personId?: string }[] }>(`/api/comments?personId=${ids.rose}`);
    assert.ok(comments.body.comments.some((item) => /millinery letter/.test(item.body)));
    const page = await maya.html(`/people/${ids.rose}/memorial`);
    assert.match(page.text, /memorial-guestbook|Guestbook/);
    assert.match(page.text, /millinery letter/);
    const living = await maya.html(`/people/${ids.maya}/memorial`);
    assert.equal(living.status, 404);
  });

  await t.test("monthly newsletter assembled from what was added", async () => {
    const news = await maya.json<{ heading: string; items: { title: string }[] }>("/api/newsletter");
    assert.equal(news.status, 200, news.body.error);
    assert.match(news.body.heading, /family newsletter/i);
    assert.ok(news.body.items.some((item) => /Rose Whitaker/.test(item.title)));
    const page = await maya.html("/newsletter");
    assert.match(page.text, /newsletter-heading|family newsletter/);
    assert.match(page.text, /Rose Whitaker/);
  });

  await t.test("ahnentafel numbers on the pedigree", async () => {
    const page = await maya.html(`/tree?view=pedigree&personId=${ids.maya}`);
    assert.match(page.text, /ahnentafel-number|No\. 1/);
    assert.match(page.text, /Maya Park/);
    assert.match(page.text, /Helen Park/);
  });

  await t.test("reunion kiosk with large type, today’s dates, and the gallery", async () => {
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker cousins at the Grange",
        place: "Grange hall",
        happenedOn: "2026-09-22",
        personIds: [ids.maya, ids.helen],
      }),
    });
    assert.equal(reunion.status, 200, reunion.body.error);
    ids.reunion = reunion.body.reunion.id;
    await maya.json("/api/reunions/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reunionId: ids.reunion, assetId: ids.photo }),
    });
    const page = await maya.html(`/reunions/${ids.reunion}/kiosk`);
    assert.match(page.text, /reunion-kiosk|kiosk-title/);
    assert.match(page.text, /Whitaker cousins at the Grange/);
    assert.match(page.text, /kiosk-today|On this day/);
    assert.match(page.text, /kiosk-gallery|Rose at the millinery counter/);
    const detail = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(detail.text, /kiosk-link|Reunion kiosk/);
  });

  await t.test("later lists a relative still uses", async () => {
    const interview = await maya.html("/to-interview");
    assert.match(interview.text, /Helen Park|Maya Park/);
    const ages = await maya.html("/ages");
    assert.match(ages.text, /Rose Whitaker/);
    assert.match(ages.text, /79|years/);
    const month = await maya.html("/this-month");
    assert.match(month.text, /Helen Park|Rose and Louis/);
    const uncited = await maya.html("/uncited");
    assert.match(uncited.text, /uncited-heading|Still needs a citation/);
    const quotes = await maya.html("/quotes");
    assert.match(quotes.text, /hatband|millinery/);
  });
});
