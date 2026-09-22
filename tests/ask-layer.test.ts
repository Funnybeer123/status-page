import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can keep an Ask conversation, letter thread, and later family records", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("ask-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker ask",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people and a letter a grandchild can ask about", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
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
    const letter = new FormData();
    letter.set("title", "June to Helen, millinery counter");
    letter.set("kind", "letter");
    letter.set("writtenAt", "1952-06-14");
    letter.set("transcript", ROSE_LETTER);
    letter.set("personIds", `${ids.rose},${ids.louis}`);
    const saved = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(saved.status, 200, saved.body.error);
    ids.letter = saved.body.document.id;
  });

  await t.test("a follow-up stays in the same conversation and still cites the letter", async () => {
    const first = await maya.json<{
      answer: string;
      conversationId: string;
      sources: { title: string; documentId: string }[];
    }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "How did grandma meet grandpa?" }),
    });
    assert.equal(first.status, 200, first.body.error);
    assert.ok(first.body.conversationId);
    ids.conversation = first.body.conversationId;
    assert.ok(first.body.sources.some((source) => source.documentId === ids.letter));
    const follow = await maya.json<{
      answer: string;
      conversationId: string;
      sources: { title: string; documentId: string }[];
    }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "What did she say about the hatband?",
        conversationId: ids.conversation,
      }),
    });
    assert.equal(follow.status, 200, follow.body.error);
    assert.equal(follow.body.conversationId, ids.conversation);
    assert.ok(follow.body.sources.some((source) => source.documentId === ids.letter));
    assert.match(`${follow.body.answer} ${follow.body.sources.map((source) => source.title).join(" ")}`, /hatband|millinery|Rose/i);
    const thread = await maya.json<{
      conversation: { id: string; turns: { role: string; text: string; sources: { documentId: string }[] }[] };
    }>(`/api/ask?conversationId=${ids.conversation}`);
    assert.equal(thread.body.conversation.turns.length, 4);
    assert.equal(thread.body.conversation.turns[0].role, "user");
    assert.ok(thread.body.conversation.turns[3].sources.some((source) => source.documentId === ids.letter));
    const page = await maya.html(`/ask?conversationId=${ids.conversation}`);
    assert.match(page.text, /hatband|millinery|grandma meet grandpa/i);
  });

  await t.test("a saved question can be reopened", async () => {
    const kept = await maya.json("/api/ask/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: ids.conversation, saved: true }),
    });
    assert.equal(kept.status, 200, kept.body.error);
    const list = await maya.json<{ conversations: { id: string; title: string }[] }>("/api/ask/saved");
    assert.ok(list.body.conversations.some((item) => item.id === ids.conversation));
    const page = await maya.html("/ask/saved");
    assert.match(page.text, /How did grandma meet grandpa/);
    assert.match(page.text, /Saved questions/);
  });

  await t.test("a reply links to the letter it answers", async () => {
    const reply = new FormData();
    reply.set("title", "Helen to June, about the hatband");
    reply.set("kind", "letter");
    reply.set("writtenAt", "1952-06-20");
    reply.set("transcript", "June, I still keep the navy hatband in the cedar drawer.");
    reply.set("replyToId", ids.letter);
    reply.set("personIds", ids.rose);
    const saved = await maya.json<{ document: { id: string; replyToId?: string } }>("/api/letters", {
      method: "POST",
      body: reply,
    });
    assert.equal(saved.status, 200, saved.body.error);
    ids.reply = saved.body.document.id;
    assert.equal(saved.body.document.replyToId, ids.letter);
    const child = await maya.html(`/letters/${ids.reply}`);
    assert.match(child.text, /In reply to/);
    assert.match(child.text, /millinery counter/);
    const parent = await maya.html(`/letters/${ids.letter}`);
    assert.match(parent.text, /Helen to June, about the hatband/);
  });

  await t.test("OCR review queue and a translation beside the original", async () => {
    const scan = new FormData();
    scan.set("title", "Faded scan of Rose’s second page");
    scan.set("kind", "letter");
    scan.set("writtenAt", "1952-06-15");
    scan.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "faded.svg");
    scan.set("personIds", ids.rose);
    const queued = await maya.json<{ document: { id: string; needsReview?: boolean } }>("/api/letters", {
      method: "POST",
      body: scan,
    });
    assert.equal(queued.status, 200, queued.body.error);
    ids.review = queued.body.document.id;
    assert.equal(queued.body.document.needsReview, true);
    const queue = await maya.json<{ documents: { id: string }[] }>("/api/ocr/queue");
    assert.ok(queue.body.documents.some((item) => item.id === ids.review));
    const ocrPage = await maya.html("/ocr");
    assert.match(ocrPage.text, /Faded scan of Rose/);
    const reviewed = await maya.json("/api/ocr/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: ids.review,
        transcript: "Rose wrote that Louis bought the navy hatband.",
        needsReview: false,
      }),
    });
    assert.equal(reviewed.status, 200, reviewed.body.error);

    const translated = await maya.json<{ document: { translation?: string } }>(`/api/letters/${ids.letter}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        translation: "Rose met Louis at the millinery counter. He bought a navy hatband.",
      }),
    });
    assert.equal(translated.status, 200, translated.body.error);
    assert.match(translated.body.document.translation || "", /navy hatband/);
    const letterPage = await maya.html(`/letters/${ids.letter}`);
    assert.match(letterPage.text, /Translation/);
    assert.match(letterPage.text, /navy hatband/);
  });

  await t.test("custody, business, award, and club", async () => {
    const photo = new FormData();
    photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "market.svg");
    photo.set("title", "Market Street counter");
    const asset = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
    ids.photo = asset.body.asset.id;

    const custody = await maya.json<{ record: { title: string } }>("/api/custody", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holderId: ids.maya,
        title: "Millinery letter",
        kind: "letter",
        documentId: ids.letter,
        sinceOn: "2016-03-12",
        notes: "In the cedar drawer.",
      }),
    });
    assert.equal(custody.status, 200, custody.body.error);
    const custodyPage = await maya.html("/custody");
    assert.match(custodyPage.text, /Millinery letter/);
    assert.match(custodyPage.text, /Maya Park/);

    const business = await maya.json<{ business: { name: string } }>("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Whitaker Millinery",
        place: "Market Street",
        startedOn: "1948-04-01",
        personIds: [ids.rose, ids.louis],
      }),
    });
    assert.equal(business.status, 200, business.body.error);
    const businessPage = await maya.html("/businesses");
    assert.match(businessPage.text, /Whitaker Millinery/);
    assert.match(businessPage.text, /Market Street/);

    const award = await maya.json("/api/awards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        title: "County fair hat ribbon",
        awardedOn: "1953-08-14",
        place: "Cedar Falls",
      }),
    });
    assert.equal(award.status, 200, award.body.error);
    const awardPage = await maya.html("/awards");
    assert.match(awardPage.text, /County fair hat ribbon/);

    const club = await maya.json("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.louis,
        club: "Market Street Merchants",
        place: "Cedar Falls",
        startedOn: "1949-01-08",
      }),
    });
    assert.equal(club.status, 200, club.body.error);
    const clubPage = await maya.html("/clubs");
    assert.match(clubPage.text, /Market Street Merchants/);
  });

  await t.test("name index on the book and an album slideshow", async () => {
    const book = await maya.html("/book");
    assert.match(book.text, /Name index/);
    assert.match(book.text, /Rose Whitaker/);
    assert.match(book.text, new RegExp(`id="chapter-${ids.rose}"`));

    const album = await maya.json<{ album: { id: string } }>("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Market Street album", summary: "The counter and the letter years." }),
    });
    assert.equal(album.status, 200, album.body.error);
    ids.album = album.body.album.id;
    const second = new FormData();
    second.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "later.svg");
    second.set("title", "Market Street today");
    const later = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: second });
    await maya.json(`/api/albums/${ids.album}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.photo }),
    });
    await maya.json(`/api/albums/${ids.album}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: later.body.asset.id }),
    });
    const albumPage = await maya.html(`/albums/${ids.album}`);
    assert.match(albumPage.text, /album-slideshow|Market Street counter|Play/);
  });

  await t.test("probate, naturalization, address, apprenticeship, mention, pet, quilt, and DNA", async () => {
    const rows = [
      { kind: "probate", personId: ids.rose, title: "Rose Whitaker’s estate", happenedOn: "2008-12-01", place: "Cedar Falls" },
      { kind: "naturalization", personId: ids.louis, court: "Northern District of Iowa", place: "Iowa City", happenedOn: "1950-05-12" },
      { kind: "address", personId: ids.rose, label: "Millinery rooms", line: "14 Market Street", locality: "Cedar Falls", region: "Iowa" },
      { kind: "apprenticeship", personId: ids.rose, trade: "Millinery", master: "Aunt June", place: "Market Street", startedOn: "1944-03-01" },
      { kind: "mention", personId: ids.rose, headline: "Whitaker fitted the navy brim", paper: "Cedar Falls Record", publishedOn: "1952-06-16" },
      { kind: "pet", personId: ids.rose, name: "Felt", petKind: "Shop cat", startedOn: "1952-06-14" },
      { kind: "textile", makerId: ids.rose, title: "Navy hatband sampler", textileKind: "sampler", madeOn: "1952-07-01" },
      { kind: "dna", personId: ids.maya, haplogroup: "H1", company: "23andMe", notes: "Wrote it on the back of June’s letter." },
    ];
    for (const row of rows) {
      const saved = await maya.json("/api/later-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      assert.equal(saved.status, 200, `${row.kind}: ${saved.body.error}`);
    }
    const pages = [
      ["/probate", /Rose Whitaker’s estate/],
      ["/naturalizations", /Northern District of Iowa/],
      ["/addresses", /14 Market Street/],
      ["/apprentices", /Millinery/],
      ["/mentions", /navy brim/],
      ["/pets", /Felt/],
      ["/quilts", /Navy hatband sampler/],
      ["/dna", /H1/],
    ] as const;
    for (const [path, pattern] of pages) {
      const page = await maya.html(path);
      assert.match(page.text, pattern, path);
    }
  });
});
