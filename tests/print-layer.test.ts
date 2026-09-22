import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can print a group sheet, ask as a grandchild, and keep later family records", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("print-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker print",
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
  const nedEmail = uniqueEmail("print-ned");
  await ned.signup({ name: "Ned Park", email: nedEmail, password: PASSWORD, invite: invite.body.token });
  await ned.signIn(nedEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a marriage, a letter, and a photograph entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
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
        happenedOn: "1953-05-01",
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

    const livingPhoto = new FormData();
    livingPhoto.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "maya.svg");
    livingPhoto.set("title", "Maya at the shop today");
    const today = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: livingPhoto });
    ids.livingPhoto = today.body.asset.id;
    await maya.json("/api/assets/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: ids.livingPhoto, personId: ids.maya }),
    });
  });

  await t.test("printable family group sheet", async () => {
    const page = await maya.html(`/group-sheets/${ids.rose}`);
    assert.match(page.text, /group-sheet/);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Louis Whitaker/);
    assert.match(page.text, /Helen Park/);
    const index = await maya.html("/group-sheets");
    assert.match(index.text, /Family group sheets/);
    assert.match(index.text, /Rose Whitaker and Louis Whitaker/);
  });

  await t.test("printable descendant report", async () => {
    const page = await maya.html(`/people/${ids.rose}/report`);
    assert.match(page.text, /descendant-report/);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Helen Park/);
    assert.match(page.text, /Maya Park/);
    assert.match(page.text, /Louis Whitaker/);
  });

  await t.test("grandchild Ask cites letters and photographs and hides living details", async () => {
    const asked = await maya.json<{
      answer: string;
      sources: { title: string; documentId: string; kind: string; excerpt: string }[];
    }>("/api/ask/grandchild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "How did grandma meet grandpa?" }),
    });
    assert.equal(asked.status, 200, asked.body.error);
    assert.match(asked.body.answer, /millinery|hatband|Rose|Louis|Grandma/i);
    assert.ok(asked.body.sources.some((source) => source.documentId === ids.letter));
    assert.ok(asked.body.sources.some((source) => source.kind === "photo" && source.documentId === ids.photo));
    assert.ok(!asked.body.sources.some((source) => source.documentId === ids.livingLetter));
    assert.ok(!asked.body.sources.some((source) => source.documentId === ids.livingPhoto));
    assert.doesNotMatch(`${asked.body.answer} ${asked.body.sources.map((source) => source.excerpt).join(" ")}`, /Oak Street|shop phone/);

    const livingAsk = await maya.json<{ answer: string; sources: { documentId: string }[] }>("/api/ask/grandchild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Where does Maya live on Oak Street?" }),
    });
    assert.equal(livingAsk.status, 200, livingAsk.body.error);
    assert.ok(!livingAsk.body.sources.some((source) => source.documentId === ids.livingLetter));
    assert.doesNotMatch(livingAsk.body.answer, /Oak Street|shop phone/);

    const page = await maya.html("/ask/grandchild");
    assert.match(page.text, /Ask simply|grandchild-ask/);
  });

  await t.test("heirloom loan log", async () => {
    const heirloom = await maya.json<{ heirloom: { id: string } }>("/api/heirlooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Navy hatband",
        summary: "The one Louis bought at the millinery counter.",
        personId: ids.rose,
        acquiredAt: "1952-06-14",
      }),
    });
    assert.equal(heirloom.status, 200, heirloom.body.error);
    ids.heirloom = heirloom.body.heirloom.id;
    const loan = await maya.json<{ loan: { id: string } }>("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heirloomId: ids.heirloom,
        borrowerId: ids.maya,
        borrowedOn: "2026-06-01",
        dueOn: "2026-10-12",
        notes: "For the reunion table, then back to the cedar drawer.",
      }),
    });
    assert.equal(loan.status, 200, loan.body.error);
    const page = await maya.html("/loans");
    assert.match(page.text, /Navy hatband/);
    assert.match(page.text, /Maya Park/);
    assert.match(page.text, /due/);
  });

  await t.test("a house with photographs across years and who lived there", async () => {
    const home = await maya.json<{ home: { id: string } }>("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker house",
        line: "14 Market Street",
        locality: "Cedar Falls",
        region: "Iowa",
        notes: "Rose wrote from the rooms over the shop.",
        personIds: [ids.rose, ids.louis],
      }),
    });
    assert.equal(home.status, 200, home.body.error);
    ids.home = home.body.home.id;
    const photo = await maya.json("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeId: ids.home,
        assetId: ids.photo,
        takenOn: "1952-06-14",
        caption: "The counter year",
      }),
    });
    assert.equal(photo.status, 200, photo.body.error);
    const later = new FormData();
    later.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "later.svg");
    later.set("title", "Market Street today");
    const laterAsset = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: later });
    ids.laterPhoto = laterAsset.body.asset.id;
    await maya.json("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeId: ids.home, assetId: ids.laterPhoto, takenOn: "2024-06-14", caption: "The same doors" }),
    });
    const page = await maya.html(`/homes/${ids.home}`);
    assert.match(page.text, /Whitaker house/);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /The counter year/);
    assert.match(page.text, /The same doors/);
  });

  await t.test("digitization queue for unscanned letters", async () => {
    const queued = await maya.json<{ item: { title: string } }>("/api/digitize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Ruth’s reply, still in the cedar chest",
        kind: "letter",
        holderId: ids.maya,
        notes: "Second page has no scan.",
      }),
    });
    assert.equal(queued.status, 200, queued.body.error);
    const list = await maya.json<{ items: { title: string }[]; unscannedLetters: { title: string }[] }>("/api/digitize");
    assert.ok(list.body.items.some((item) => /cedar chest/.test(item.title)));
    assert.ok(list.body.unscannedLetters.some((item) => /millinery counter/.test(item.title)));
    const page = await maya.html("/digitize");
    assert.match(page.text, /Ruth’s reply|cedar chest/);
    assert.match(page.text, /millinery counter/);
  });

  await t.test("pin a memory on the family home", async () => {
    const pin = await maya.json<{ pin: { title: string } }>("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "The millinery letter",
        note: "How Grandma met Grandpa.",
        documentId: ids.letter,
      }),
    });
    assert.equal(pin.status, 200, pin.body.error);
    const home = await maya.html("/");
    assert.match(home.text, /The millinery letter/);
    assert.match(home.text, /Pinned memories|home-pins/);
  });

  await t.test("@mentions in comments create an in-app notification", async () => {
    const comment = await maya.json("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: ids.letter,
        body: "@Ned Park, the millinery letter is still in the cedar drawer.",
      }),
    });
    assert.equal(comment.status, 200, comment.body.error);
    const notices = await ned.json<{ notifications: { title: string; body?: string | null }[] }>("/api/notifications");
    assert.ok(
      notices.body.notifications.some(
        (item) => /Mentioned you/.test(item.title) && /millinery letter/.test(item.body || ""),
      ),
      JSON.stringify(notices.body.notifications.map((item) => item.title)),
    );
    const page = await ned.html("/notifications");
    assert.match(page.text, /Mentioned you/);
  });

  await t.test("reunion gallery tied to a reunion", async () => {
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker cousins at the Grange",
        place: "Grange hall",
        happenedOn: "2026-07-04",
        personIds: [ids.maya, ids.helen],
      }),
    });
    assert.equal(reunion.status, 200, reunion.body.error);
    ids.reunion = reunion.body.reunion.id;
    const photo = await maya.json("/api/reunions/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reunionId: ids.reunion, assetId: ids.photo }),
    });
    assert.equal(photo.status, 200, photo.body.error);
    const page = await maya.html(`/reunions/${ids.reunion}`);
    assert.match(page.text, /reunion-gallery|Rose at the millinery counter/);
  });

  await t.test("a handwriting sample on a person, linked from a letter", async () => {
    const sample = await maya.json<{ sample: { id: string } }>("/api/handwriting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: ids.rose,
        documentId: ids.letter,
        notes: "The long loops on millinery.",
      }),
    });
    assert.equal(sample.status, 200, sample.body.error);
    const handwriting = await maya.html("/handwriting");
    assert.match(handwriting.text, /Rose Whitaker/);
    assert.match(handwriting.text, /millinery counter/);
    const person = await maya.html(`/people/${ids.rose}`);
    assert.match(person.text, /person-handwriting|long loops on millinery/);
    const letter = await maya.html(`/letters/${ids.letter}`);
    assert.match(letter.text, /letter-handwriting|Rose Whitaker/);
  });

  await t.test("inscriptions, holidays, marriages, correspondents, and later firsts", async () => {
    await maya.json(`/api/people/${ids.rose}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ causeOfDeath: "In her sleep at home", burialPlot: "Fairview, lot 14" }),
    });
    await maya.json("/api/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose, kind: "nickname", name: "Rosie" }),
    });
    await maya.json("/api/witnesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ids.wedding, personId: ids.helen, role: "witness" }),
    });
    const oral = new FormData();
    oral.set("file", new Blob(["oral history placeholder"], { type: "audio/mpeg" }), "helen.mp3");
    oral.set("title", "Helen on the millinery counter");
    oral.set("kind", "audio");
    const recording = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: oral });
    assert.equal(recording.status, 200, recording.body.error);

    for (const row of [
      { kind: "inscription", personId: ids.rose, text: "At rest under the cottonwoods", place: "Fairview Cemetery" },
      { kind: "holiday", title: "Harvest-dance anniversary supper", season: "October", notes: "Sunday rolls and cider" },
    ]) {
      const saved = await maya.json("/api/later-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      assert.equal(saved.status, 200, `${row.kind}: ${saved.body.error}`);
    }

    const pages = [
      ["/inscriptions", /At rest under the cottonwoods/],
      ["/holidays", /Harvest-dance anniversary supper/],
      ["/marriages", /Rose Whitaker/],
      ["/correspondents", /June to Helen/],
      ["/deaths", /In her sleep at home/],
      ["/nicknames", /Rosie/],
      ["/plots", /Fairview, lot 14/],
      ["/witnesses", /Helen Park/],
      ["/oral", /Helen on the millinery counter/],
      ["/firsts", /Earliest letter|June to Helen/],
    ] as const;
    for (const [path, pattern] of pages) {
      const page = await maya.html(path);
      assert.match(page.text, pattern, path);
    }
  });
});
