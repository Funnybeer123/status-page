import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import { chapterForItem, chapterHeading, compileLifeChapters, defaultChapterRanges } from "../src/lib/chapters";
import { compileReviewInbox, inboxHeading } from "../src/lib/reviewInbox";
import { personSearchHeading, searchPersonItems, searchTokens } from "../src/lib/personSearch";
import { remindersTomorrow, tomorrowHeading } from "../src/lib/reminders";
import { renderTreeSvg, treeSvgFilename } from "../src/lib/treeSvg";
import { filmMomentLine, formatTimecode, parseTimecode, sortFilmMoments } from "../src/lib/filmMoments";
import { landAbstractLine } from "../src/lib/landAbstract";
import { unitHeading, unitRosterLine } from "../src/lib/militaryUnit";
import { cemeteryMapPoints } from "../src/lib/cemeteryMap";
import { canSeeOwnerNote, redactOwnerNote } from "../src/lib/privacy";
import { compileLanguages } from "../src/lib/languages";
import { compileBaptisms, compileCauses } from "../src/lib/baptisms";

test("life chapters group childhood, work, and later years", () => {
  const ranges = defaultChapterRanges("1929-03-08", "2008-11-02");
  assert.equal(ranges[0]?.kind, "childhood");
  assert.equal(ranges[1]?.kind, "work");
  assert.equal(ranges[2]?.kind, "later");
  const items = [
    { id: "p", kind: "photo" as const, title: "Rose as a girl", happenedOn: "1936-06-14", href: "/p" },
    { id: "l", kind: "letter" as const, title: "Millinery counter", happenedOn: "1952-06-14", href: "/l" },
    { id: "s", kind: "story" as const, title: "Sunday rolls", happenedOn: "2001-04-02", href: "/s" },
  ];
  const chapters = compileLifeChapters({
    birthDate: "1929-03-08",
    deathDate: "2008-11-02",
    items,
  });
  assert.equal(chapters.find((row) => row.kind === "childhood")?.items[0]?.title, "Rose as a girl");
  assert.equal(chapters.find((row) => row.kind === "work")?.items[0]?.title, "Millinery counter");
  assert.equal(chapters.find((row) => row.kind === "later")?.items[0]?.title, "Sunday rolls");
  assert.equal(chapterForItem(ranges, items[1]!), "work");
  assert.match(chapterHeading(chapters[1]!), /Work years/);
});

test("needs-review inbox lists OCR, uncited facts, faces, and duplicates", () => {
  const items = compileReviewInbox({
    ocr: [{ id: "d1", title: "Faded scan of Rose" }],
    uncited: [{ id: "u1", name: "Helen Park", kind: "birth", reason: "A birth date is recorded, but no birth citation yet.", href: "/worksheets" }],
    unlocated: [{ id: "t1", personId: "louis", name: "Louis Whitaker", x: null, y: null, assetTitle: "Picnic", assetId: "a1" }],
    duplicates: [{ keepId: "a", dropId: "b", keepName: "Rose Whitaker", dropName: "Rose W. Whitaker", score: 80, reasons: ["same name"] }],
  });
  assert.equal(items.map((item) => item.kind).join(","), "ocr,uncited,unlocated,duplicate");
  assert.match(inboxHeading(4), /4/);
});

test("search inside one person keeps only matching letters and stories", () => {
  assert.deepEqual(searchTokens("navy hatband"), ["navy", "hatband"]);
  const hits = searchPersonItems(
    [
      { id: "1", kind: "letter", title: "June to Helen", body: "the millinery counter and a navy hatband", href: "/l" },
      { id: "2", kind: "story", title: "Bees", body: "cottonwoods", href: "/s" },
    ],
    "navy hatband",
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.title, "June to Helen");
  assert.match(personSearchHeading("navy", 1), /navy/);
});

test("tomorrow’s reminder is the date one day away", () => {
  const rows = remindersTomorrow([
    { id: "1", kind: "birthday", title: "Birthday · Helen", personId: "h", personName: "Helen", originalOn: "1954-09-23", nextOn: "2026-09-23", monthDay: "23 September", daysUntil: 1, hideYear: false },
    { id: "2", kind: "death", title: "Rose", personId: "r", personName: "Rose", originalOn: "2008-11-02", nextOn: "2026-11-02", monthDay: "2 November", daysUntil: 41, hideYear: false },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.personName, "Helen");
  assert.match(tomorrowHeading(1), /Tomorrow/);
});

test("the tree serializes as SVG", () => {
  const svg = renderTreeSvg(
    [
      {
        id: "rose",
        familyId: "f",
        displayName: "Rose Whitaker",
        givenName: "Rose",
        familyName: "Whitaker",
        birthDate: new Date("1929-03-08"),
        deathDate: new Date("2008-11-02"),
        notes: null,
        profileAssetId: null,
        sex: "F",
        gedcomXref: null,
        causeOfDeath: null,
        languages: null,
        burialPlot: null,
        pronunciation: null,
        ownerNote: null,
        deletedAt: null,
        profileUrl: null,
      },
    ] as never,
    [],
    "Whitaker packet",
  );
  assert.match(svg, /<svg /);
  assert.match(svg, /Rose Whitaker/);
  assert.equal(treeSvgFilename("Whitaker packet"), "whitaker-packet-tree.svg");
});

test("film moments keep a timestamp", () => {
  assert.equal(formatTimecode(83), "1:23");
  assert.equal(parseTimecode("1:23"), 83);
  const sorted = sortFilmMoments([
    { id: "b", seconds: 90, title: "Later" },
    { id: "a", seconds: 12, title: "Door" },
  ]);
  assert.equal(sorted[0]?.title, "Door");
  assert.equal(filmMomentLine(sorted[0]!), "0:12 · Door");
});

test("a land abstract names the home, and a unit names who served", () => {
  assert.match(
    landAbstractLine({ title: "North farm", homeTitle: "North farm house", abstract: "The north forty stayed with the children." }),
    /North farm house/,
  );
  assert.match(unitRosterLine({ unitName: "Black Hawk County draft board", personName: "Louis Whitaker", rank: "Clerk", branch: "Army" }), /Louis Whitaker/);
  assert.match(unitHeading("Black Hawk County draft board", 2), /2 who served/);
});

test("cemeteries with a town find a map pin, and owner notes stay with the owner", () => {
  const pins = cemeteryMapPoints([
    { id: "1", name: "Fairview Cemetery", locality: "Cedar Falls", region: "Iowa" },
  ]);
  assert.equal(pins.length, 1);
  assert.ok(pins[0]!.latitude);
  assert.equal(canSeeOwnerNote(Role.owner), true);
  assert.equal(canSeeOwnerNote(Role.contributor), false);
  assert.equal(redactOwnerNote({ ownerNote: "desk key" }, Role.viewer).ownerNote, null);
  assert.equal(redactOwnerNote({ ownerNote: "desk key" }, Role.owner).ownerNote, "desk key");
});

test("baptisms, causes, and languages compile from what a relative entered", () => {
  const baptisms = compileBaptisms([
    { id: "1", kind: "baptism", title: "Rose baptized", happenedOn: "1929-04-01", personId: "r", personName: "Rose Whitaker", place: "St. John's" },
    { id: "2", kind: "birth", title: "Born", happenedOn: "1929-03-08", personId: "r", personName: "Rose Whitaker" },
  ]);
  assert.equal(baptisms.length, 1);
  const causes = compileCauses([
    { id: "r", displayName: "Rose Whitaker", causeOfDeath: "Pneumonia", deathDate: "2008-11-02" },
    { id: "h", displayName: "Helen Park", causeOfDeath: null, deathDate: null },
  ]);
  assert.equal(causes[0]?.causeOfDeath, "Pneumonia");
  const languages = compileLanguages([
    { id: "r", displayName: "Rose Whitaker", languages: "English, Czech" },
  ]);
  assert.equal(languages.length, 2);
  assert.equal(languages[0]?.language, "Czech");
});
