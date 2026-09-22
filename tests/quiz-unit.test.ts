import assert from "node:assert/strict";
import { test } from "node:test";
import { compileGrandchildQuiz } from "../src/lib/grandchildQuiz";
import { compileLetterThread, threadRootId } from "../src/lib/letterThread";
import { suggestPlaceDuplicates } from "../src/lib/placeDuplicates";
import { compileNewsletter, monthKey, newsletterLine } from "../src/lib/newsletter";
import { compileWorksheet } from "../src/lib/worksheets";
import { compileInterviewList } from "../src/lib/toInterview";
import { compileAgesAtDeath } from "../src/lib/ageAtDeath";
import { compileMonthDates } from "../src/lib/monthDates";
import { compileUncited } from "../src/lib/uncited";
import { compileLetterInventory } from "../src/lib/letterInventory";
import { compileQuotes } from "../src/lib/quotes";
import { ahnentafelOnTree, buildPedigree } from "../src/lib/pedigree";
import { ROSE_LETTER } from "./helpers/fixtures";

test("grandchild quiz cites the letter that remembers the millinery counter", () => {
  const items = compileGrandchildQuiz([
    {
      id: "june",
      title: "June to Helen",
      kind: "letter",
      body: ROSE_LETTER,
      href: "/letters/june",
    },
    {
      id: "maya",
      title: "Maya’s shop",
      kind: "letter",
      body: "Maya Park lives at 9 Oak Street and answers the shop phone.",
      href: "/letters/maya",
    },
  ]);
  assert.ok(items.some((item) => /meet/i.test(item.question) && /hatband|millinery/i.test(item.answer)));
  assert.ok(items.some((item) => item.href === "/letters/june" && /hatband/i.test(item.question + item.answer)));
  assert.ok(items.every((item) => item.href && item.sourceTitle));
});

test("a letter thread reads back and forth from the first letter", () => {
  const letters = [
    { id: "reply", title: "Helen’s reply", transcript: "I still have the hatband.", writtenAt: "1952-07-01", replyToId: "june" },
    { id: "june", title: "June to Helen", transcript: ROSE_LETTER, writtenAt: "1952-06-14", replyToId: null },
  ];
  assert.equal(threadRootId(letters, "reply"), "june");
  const thread = compileLetterThread(letters, "reply");
  assert.equal(thread[0]?.id, "june");
  assert.equal(thread[0]?.side, "left");
  assert.equal(thread[1]?.id, "reply");
  assert.equal(thread[1]?.side, "right");
});

test("duplicate places share a name the family already wrote", () => {
  const pairs = suggestPlaceDuplicates([
    { id: "a", name: "Market Street", locality: "Cedar Falls" },
    { id: "b", name: "Market Street shop", locality: "Cedar Falls" },
    { id: "c", name: "Iowa City", locality: "Iowa City" },
  ]);
  assert.ok(pairs.some((pair) => pair.keepId === "b" && pair.dropId === "a"));
  assert.ok(!pairs.some((pair) => pair.keepId === "c" || pair.dropId === "c"));
});

test("the monthly newsletter keeps what relatives added that month", () => {
  const month = monthKey(new Date("2026-09-22T12:00:00Z"));
  const compiled = compileNewsletter(
    [
      { id: "1", title: "Rose Whitaker", href: "/people/rose", when: "2026-09-04T12:00:00Z", kind: "person" },
      { id: "2", title: "June to Helen", href: "/letters/june", when: "2026-08-01T12:00:00Z", kind: "letter" },
      { id: "3", title: "The counter", href: "/archive/p", when: "2026-09-10T12:00:00Z", kind: "photo" },
    ],
    month,
  );
  assert.match(compiled.heading, /September 2026/);
  assert.equal(compiled.items.length, 2);
  assert.equal(compiled.counts.people, 1);
  assert.equal(compiled.counts.photos, 1);
  assert.match(newsletterLine(compiled.items[0]), /Rose Whitaker/);
});

test("citation worksheets write a claim a relative can find again", () => {
  const census = compileWorksheet({
    kind: "census",
    personName: "Rose Whitaker",
    personId: "rose",
    year: "1950",
    place: "Cedar Falls",
    detail: "ED 7-12, sheet 4",
  });
  assert.match(census.claim, /Rose Whitaker was counted in 1950 at Cedar Falls/);
  assert.match(census.pageNote, /ED 7-12/);
  const birth = compileWorksheet({
    kind: "birth",
    personName: "Rose Whitaker",
    personId: "rose",
    year: "1929-03-08",
    place: "Cedar Falls",
  });
  assert.equal(birth.happenedOn, "1929-03-08");
  assert.match(birth.claim, /born/);
  const death = compileWorksheet({ kind: "death", personName: "Rose Whitaker", personId: "rose", year: "2008" });
  assert.match(death.claim, /died in 2008/);
});

test("who to interview lists living people without answers, oldest first", () => {
  const rows = compileInterviewList(
    [
      { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { id: "helen", displayName: "Helen Park", birthDate: "1954-09-22", deathDate: null },
      { id: "maya", displayName: "Maya Park", birthDate: "1983-01-30", deathDate: null },
    ],
    ["maya"],
  );
  assert.deepEqual(rows.map((row) => row.id), ["helen"]);
});

test("age at death uses both dates", () => {
  const rows = compileAgesAtDeath([
    { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    { id: "helen", displayName: "Helen Park", birthDate: "1954-09-22", deathDate: null },
  ]);
  assert.equal(rows[0]?.name, "Rose Whitaker");
  assert.equal(rows[0]?.age, 79);
});

test("this month lists birthdays and weddings that fall in September", () => {
  const rows = compileMonthDates(
    {
      people: [
        { id: "helen", displayName: "Helen Park", birthDate: "1954-09-22", deathDate: null },
        { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      ],
      marriages: [{ id: "w", title: "Rose and Louis married", happenedOn: "1953-09-22", personId: "rose" }],
    },
    new Date("2026-09-22T12:00:00Z"),
  );
  assert.ok(rows.some((row) => row.kind === "birthday" && row.name === "Helen Park"));
  assert.ok(rows.some((row) => row.kind === "wedding"));
  assert.ok(!rows.some((row) => row.name === "Rose Whitaker" && row.kind === "birthday"));
});

test("uncited vitals ask for a birth, death, or census page", () => {
  const rows = compileUncited({
    people: [
      { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { id: "helen", displayName: "Helen Park", birthDate: "1954-09-22", deathDate: null },
    ],
    citations: [{ personId: "rose", kind: "birth" }],
    censusPersonIds: ["rose"],
  });
  assert.ok(rows.some((row) => row.id === "rose-death"));
  assert.ok(rows.some((row) => row.id === "rose-census"));
  assert.ok(!rows.some((row) => row.id === "rose-birth"));
  assert.ok(rows.some((row) => row.id === "helen-birth"));
});

test("letter inventory says whether a scan or a reply is missing", () => {
  const rows = compileLetterInventory([
    { id: "june", title: "June to Helen", assetId: "scan", replies: [{ id: "r" }] },
    { id: "note", title: "A note", assetId: null, replies: [] },
  ]);
  assert.match(rows[0].status, /Has a scan/);
  assert.match(rows[0].status, /1 reply/);
  assert.match(rows[1].status, /No scan yet/);
  assert.match(rows[1].status, /no reply/);
});

test("quotes pick the line a relative would read aloud", () => {
  const rows = compileQuotes([
    { id: "june", title: "June to Helen", body: ROSE_LETTER, href: "/letters/june" },
  ]);
  assert.ok(rows.some((row) => /hatband|millinery|Market Street/.test(row.line)));
});

test("ahnentafel numbers sit on the pedigree cards", () => {
  const tree = buildPedigree(
    "maya",
    [
      { id: "rose", displayName: "Rose" },
      { id: "louis", displayName: "Louis" },
      { id: "helen", displayName: "Helen" },
      { id: "maya", displayName: "Maya" },
    ],
    [
      { type: "parent", fromPersonId: "rose", toPersonId: "helen" },
      { type: "parent", fromPersonId: "louis", toPersonId: "helen" },
      { type: "parent", fromPersonId: "helen", toPersonId: "maya" },
    ],
  );
  const numbers = ahnentafelOnTree(tree);
  assert.equal(numbers.get("maya"), 1);
  assert.equal(numbers.get("helen"), 2);
  assert.ok(numbers.get("rose") === 4 || numbers.get("louis") === 4);
});
