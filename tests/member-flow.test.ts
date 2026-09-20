import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { ROSE_LETTER, makeLetterPng, makePhotoSvg, makeVideo } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a new family member can sign up, build a tree, archive, letter, and Ask", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("maya");

  await t.test("sign up creates an account and a family", async () => {
    const created = await maya.signup({
      name: "Maya Park",
      email,
      password: PASSWORD,
      familyName: "Whitaker family",
    });
    assert.equal(created.status, 200, created.body.error);
    assert.equal(created.body.ok, true);
  });

  await t.test("sign in yields a session", async () => {
    const login = await maya.signIn(email, PASSWORD);
    assert.ok(login.session.user?.id, "expected a session user id");
    assert.equal(login.session.user?.email, email);
  });

  await t.test("family list includes the family she created", async () => {
    const families = await maya.json<{
      memberships: { role: string; family: { id: string; name: string } }[];
      activeFamilyId: string | null;
    }>("/api/families");
    assert.equal(families.status, 200);
    assert.equal(families.body.memberships.length, 1);
    assert.equal(families.body.memberships[0].family.name, "Whitaker family");
    assert.equal(families.body.memberships[0].role, "owner");
  });

  const ids: Record<string, string> = {};

  await t.test("add people the way a relative would", async () => {
    const people = [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", notes: "Grandma. Worked the millinery counter." },
      { key: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", birthDate: "1926-11-02", notes: "Grandpa. Bought a navy hatband." },
      { key: "helen", displayName: "Helen Park", givenName: "Helen", familyName: "Park", birthDate: "1954-09-19", notes: "Daughter of Rose and Louis." },
      { key: "nora", displayName: "Nora Park", givenName: "Nora", familyName: "Park", birthDate: "1983-01-30", notes: "Granddaughter asking the questions." },
    ];
    for (const person of people) {
      const created = await maya.json<{ person: { id: string; displayName: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
  });

  await t.test("link partners and parents", async () => {
    const links = [
      { fromPersonId: ids.rose, toPersonId: ids.louis, type: "partner", startedAt: "1953-05-01" },
      { fromPersonId: ids.rose, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.louis, toPersonId: ids.helen, type: "parent" },
      { fromPersonId: ids.helen, toPersonId: ids.nora, type: "parent" },
    ];
    for (const link of links) {
      const created = await maya.json("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(link),
      });
      assert.equal(created.status, 200, created.body.error);
    }
  });

  await t.test("tree page renders the people she entered, not the Hart seed", async () => {
    const page = await maya.html("/tree");
    assert.equal(page.status, 200);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Louis Whitaker/);
    assert.match(page.text, /Helen Park/);
    assert.match(page.text, /Nora Park/);
    assert.match(page.text, /Whitaker family/);
    assert.doesNotMatch(page.text, /Eleanor Hart/);
    assert.doesNotMatch(page.text, /Hart family are seeded/);
  });

  await t.test("upload a dated photo and tag people", async () => {
    const form = new FormData();
    form.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "market-street.svg");
    form.set("title", "Market Street shop window");
    form.set("capturedAt", "1952-06-14");
    form.set("kind", "photo");
    form.set("personIds", `${ids.rose},${ids.louis}`);
    const uploaded = await maya.json<{
      asset: { id: string; capturedAt: string; tags: { person: { displayName: string } }[] };
    }>("/api/assets", { method: "POST", body: form });
    assert.equal(uploaded.status, 200, uploaded.body.error);
    assert.match(uploaded.body.asset.capturedAt, /1952-06-14/);
    const names = uploaded.body.asset.tags.map((tag) => tag.person.displayName).sort();
    assert.deepEqual(names, ["Louis Whitaker", "Rose Whitaker"]);
  });

  await t.test("upload a dated video", async () => {
    const video = makeVideo();
    const form = new FormData();
    form.set("file", new Blob([video.bytes], { type: "video/mp4" }), "reunion.mp4");
    form.set("title", "Family reunion reel");
    form.set("capturedAt", "1964-07-04");
    form.set("kind", "video");
    form.set("personIds", ids.helen);
    const uploaded = await maya.json<{ asset: { kind: string; capturedAt: string } }>("/api/assets", {
      method: "POST",
      body: form,
    });
    assert.equal(uploaded.status, 200, uploaded.body.error);
    assert.equal(uploaded.body.asset.kind, "video");
    assert.match(uploaded.body.asset.capturedAt, /1964-07-04/);
  });

  await t.test("archive lists uploads and year filter uses the timestamp she set", async () => {
    const all = await maya.json<{ assets: { title: string; capturedAt: string; kind: string }[] }>("/api/assets");
    assert.equal(all.status, 200);
    const titles = all.body.assets.map((asset) => asset.title);
    assert.ok(titles.includes("Market Street shop window"));
    assert.ok(titles.includes("Family reunion reel"));
    const year = await maya.json<{ assets: { title: string }[] }>("/api/assets?year=1952");
    assert.equal(year.body.assets.length, 1);
    assert.equal(year.body.assets[0].title, "Market Street shop window");
    const page = await maya.html("/archive");
    assert.equal(page.status, 200);
    assert.match(page.text, /Market Street shop window/);
    assert.match(page.text, /Family reunion reel/);
  });

  const letter = makeLetterPng();
  let letterId = "";

  await t.test("OCR a letter scan then keep an edited transcript", async () => {
    const ocrForm = new FormData();
    ocrForm.set("file", new Blob([letter.bytes], { type: "image/png" }), "rose-letter.png");
    const ocr = await maya.json<{ text: string }>("/api/ocr", { method: "POST", body: ocrForm });
    assert.equal(ocr.status, 200, ocr.body.error);
    const ocrText = (ocr.body.text || "").toLowerCase();
    assert.ok(
      /millinery|rose|louis|market/.test(ocrText),
      `OCR should read the scan, got: ${ocr.body.text?.slice(0, 200)}`,
    );

    const save = new FormData();
    save.set("file", new Blob([letter.bytes], { type: "image/png" }), "rose-letter.png");
    save.set("title", "Aunt June on how Rose met Louis");
    save.set("writtenAt", "1952-06-14");
    save.set("kind", "letter");
    save.set("transcript", ROSE_LETTER);
    save.set("personIds", `${ids.rose},${ids.louis}`);
    const created = await maya.json<{ document: { id: string; transcript: string } }>("/api/letters", {
      method: "POST",
      body: save,
    });
    assert.equal(created.status, 200, created.body.error);
    letterId = created.body.document.id;
    assert.match(created.body.document.transcript, /millinery counter/);
  });

  await t.test("letter page shows the scan transcript she saved", async () => {
    const page = await maya.html(`/letters/${letterId}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /millinery counter/);
    assert.match(page.text, /Aunt June on how Rose met Louis/);
    const edited = await maya.json(`/api/letters/${letterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: `${ROSE_LETTER}\n\n(Nora typed this in from the scan.)`,
      }),
    });
    assert.equal(edited.status, 200, edited.body.error);
  });

  await t.test("Ask answers from the letter she uploaded, not the Hart seed", async () => {
    const asked = await maya.json<{ answer: string; mode: string; sources: { title: string; documentId: string }[] }>(
      "/api/ask",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "How did grandma meet grandpa?" }),
      },
    );
    assert.equal(asked.status, 200, asked.body.error);
    const answer = asked.body.answer.toLowerCase();
    assert.match(answer, /millinery|market street|hatband|picture show/);
    assert.doesNotMatch(asked.body.answer, /Eleanor Whitaker|Cedar Falls|Grange hall/);
    assert.equal(asked.body.mode, "retrieval");
    assert.ok(asked.body.sources.some((source) => source.documentId === letterId));
    assert.ok(asked.body.sources.some((source) => /Rose met Louis|Aunt June/i.test(source.title)));
  });

  await t.test("person profile lists the tagged photo and the letter", async () => {
    const page = await maya.html(`/people/${ids.rose}`);
    assert.equal(page.status, 200);
    assert.match(page.text, /Rose Whitaker/);
    assert.match(page.text, /Aunt June on how Rose met Louis/);
    assert.match(page.text, /Market Street shop window/);
  });
});
