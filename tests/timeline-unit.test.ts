import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import {
  buildTimelineRows,
  computeGaps,
  countBySource,
  filterHistory,
  filterMissing,
  findMissingFacts,
  kindLabel,
  type TimelineEntry,
} from "../src/lib/timeline";

function entry(partial: Partial<TimelineEntry> & Pick<TimelineEntry, "id" | "title">): TimelineEntry {
  return {
    source: "event",
    kind: "other",
    summary: null,
    happenedOn: null,
    href: "/",
    people: [],
    generations: [],
    place: null,
    mediaUrl: null,
    mimeType: null,
    ...partial,
  };
}

test("computeGaps names silent years between dated facts", () => {
  const gaps = computeGaps([
    entry({ id: "1", title: "Born", happenedOn: "1929-03-08" }),
    entry({ id: "2", title: "Met at the counter", happenedOn: "1952-06-14" }),
    entry({ id: "3", title: "Same day letter", happenedOn: "1952-06-14" }),
    entry({ id: "4", title: "Helen born", happenedOn: "1954-09-19" }),
  ]);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].after, "1929-03-08");
  assert.equal(gaps[0].before, "1952-06-14");
  assert.ok(gaps[0].years >= 23);
  assert.match(gaps[0].title, /unrecorded years/);
});

test("filterHistory keeps a person or a generation", () => {
  const rose = { id: "rose", displayName: "Rose", generation: 0 };
  const helen = { id: "helen", displayName: "Helen", generation: 1 };
  const items = [
    entry({ id: "a", title: "Rose born", people: [rose], generations: [0], happenedOn: "1929-03-08" }),
    entry({ id: "b", title: "Helen born", people: [helen], generations: [1], happenedOn: "1954-09-19" }),
    entry({ id: "c", title: "Picnic", people: [rose, helen], generations: [0, 1], happenedOn: "1961-07-04" }),
  ];
  assert.deepEqual(filterHistory(items, { personId: "rose" }).map((item) => item.id), ["a", "c"]);
  assert.deepEqual(filterHistory(items, { generation: 1 }).map((item) => item.id), ["b", "c"]);
  assert.deepEqual(filterHistory(items, { personIds: ["rose"] }).map((item) => item.id), ["a", "c"]);
});

test("buildTimelineRows inserts decade marks and gaps", () => {
  const items = [
    entry({ id: "a", title: "Born", happenedOn: "1929-03-08" }),
    entry({ id: "b", title: "Met", happenedOn: "1952-06-14" }),
  ];
  const rows = buildTimelineRows(items, computeGaps(items));
  assert.equal(rows[0].type, "decade");
  if (rows[0].type === "decade") assert.equal(rows[0].label, "1920s");
  assert.ok(rows.some((row) => row.type === "gap"));
  assert.ok(rows.filter((row) => row.type === "entry").length === 2);
});

test("findMissingFacts flags a blank birth, a dateless marriage, and an undated letter", () => {
  const missing = findMissingFacts({
    people: [
      { id: "ada", displayName: "Ada Cousin", birthDate: null, deathDate: null },
      { id: "rose", displayName: "Rose", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { id: "lou", displayName: "Louis", birthDate: "1926-11-02", deathDate: null },
    ],
    relationships: [{ type: "partner", fromPersonId: "rose", toPersonId: "lou", startedAt: null }],
    events: [],
    entries: [entry({ id: "letter-1", source: "letter", kind: "letter", title: "Aunt June", happenedOn: null })],
    role: Role.owner,
  });
  assert.ok(missing.some((item) => item.kind === "birth" && /Ada Cousin/.test(item.title)));
  assert.ok(missing.some((item) => item.kind === "marriage" && /Rose/.test(item.title)));
  assert.ok(missing.some((item) => item.kind === "undated" && /Aunt June/.test(item.title)));
});

test("kindLabel names every source the way a relative would read it", () => {
  assert.equal(kindLabel("note", "note"), "Oral note");
  assert.equal(kindLabel("photo", "photo"), "Photograph");
  assert.equal(kindLabel("video", "video"), "Film");
  assert.equal(kindLabel("residence", "event"), "Move");
  assert.equal(kindLabel("capsule", "letter"), "Time capsule");
});

test("filterMissing keeps only the person or generation in view", () => {
  const people = [
    { id: "ada", displayName: "Ada Cousin", generation: 1 },
    { id: "rose", displayName: "Rose", generation: 0 },
  ];
  const missing = [
    { id: "1", kind: "birth" as const, title: "No birth date for Ada Cousin", summary: "", personId: "ada", href: "/" },
    { id: "2", kind: "marriage" as const, title: "No marriage date for Rose", summary: "", personId: "rose", href: "/" },
  ];
  assert.deepEqual(filterMissing(missing, people, { personId: "rose" }).map((item) => item.id), ["2"]);
  assert.deepEqual(filterMissing(missing, people, { generation: 1 }).map((item) => item.id), ["1"]);
});

test("countBySource tallies the whole history", () => {
  const counts = countBySource([
    entry({ id: "1", title: "Born", source: "event" }),
    entry({ id: "2", title: "Letter", source: "letter" }),
    entry({ id: "3", title: "Photo", source: "photo" }),
    entry({ id: "4", title: "Reel", source: "video" }),
    entry({ id: "5", title: "Story", source: "story" }),
  ]);
  assert.equal(counts.events, 1);
  assert.equal(counts.photos, 1);
  assert.equal(counts.videos, 1);
  assert.equal(counts.stories, 1);
});
