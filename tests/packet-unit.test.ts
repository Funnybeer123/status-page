import assert from "node:assert/strict";
import { test } from "node:test";
import { buildZip, crc32, zipEntryNames } from "../src/lib/zip";
import { compilePersonFacts, packetLetterName, packetPhotoName, packetSlug } from "../src/lib/personPacket";
import { compileThisWeek, inThisWeek, thisWeekHeading, thisWeekSince } from "../src/lib/thisWeek";
import { isSourceQuality, normalizeQuality, qualityLabel } from "../src/lib/sourceQuality";
import { compilePotluck } from "../src/lib/potluck";
import { livingMinors } from "../src/lib/children";
import { missingPronunciations, saidAs } from "../src/lib/pronounce";
import { placedOnPhoto, unlocatedTags } from "../src/lib/whoWhere";

test("a person packet zip keeps facts, a letter, and a photograph", () => {
  const facts = compilePersonFacts({
    person: {
      id: "rose",
      displayName: "Rose Whitaker",
      birthDate: "1929-03-08",
      deathDate: "2008-11-02",
      notes: "She kept the navy hatband.",
      pronunciation: "rose WIT-uh-ker",
    },
    letters: [{ title: "June to Helen", writtenAt: "1952-06-14", transcript: "millinery counter" }],
    photos: [{ title: "Rose at the counter", filename: "counter.svg" }],
    facts: [{ claim: "Born in Cedar Falls", quality: "original" }],
  });
  assert.match(facts, /Rose Whitaker/);
  assert.match(facts, /Said: rose WIT-uh-ker/);
  assert.match(facts, /June to Helen/);
  assert.match(facts, /Born in Cedar Falls \(original\)/);
  const zip = buildZip([
    { name: "facts.txt", data: Buffer.from(facts) },
    { name: packetLetterName("June to Helen", 0), data: Buffer.from("millinery counter") },
    { name: packetPhotoName("Rose at the counter", "counter.svg", 0), data: Buffer.from("<svg/>") },
  ]);
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  const names = zipEntryNames(zip);
  assert.deepEqual(names, ["facts.txt", "letters/01-june-to-helen.txt", "photos/01-rose-at-the-counter.svg"]);
  assert.equal(packetSlug("Rose Whitaker"), "rose-whitaker");
  assert.ok(crc32(Buffer.from("hello")) !== crc32(Buffer.from("hallo")));
});

test("this week keeps only the last seven days", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  assert.equal(thisWeekSince(now).toISOString(), "2026-09-15T12:00:00.000Z");
  assert.equal(inThisWeek("2026-09-16T10:00:00Z", now), true);
  assert.equal(inThisWeek("2026-09-10T10:00:00Z", now), false);
  const items = compileThisWeek(
    [
      { id: "1", title: "Sunday rolls", verb: "listed", createdAt: "2026-09-20T12:00:00Z" },
      { id: "2", title: "Old letter", verb: "added", createdAt: "2026-08-01T12:00:00Z" },
    ],
    now,
  );
  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Sunday rolls");
  assert.match(thisWeekHeading(2), /2/);
});

test("source quality is original, copy, or unsure", () => {
  assert.equal(isSourceQuality("original"), true);
  assert.equal(normalizeQuality("COPY"), "copy");
  assert.equal(qualityLabel("unsure"), "Unsure");
  assert.equal(normalizeQuality("maybe"), null);
});

test("a potluck dish names the recipe and who is bringing it", () => {
  const rows = compilePotluck([
    { id: "1", title: "Sunday rolls", personName: "Margaret Chen", recipeTitle: "Sunday rolls", recipeId: "r1" },
  ]);
  assert.match(rows[0]!.line, /brought by Margaret Chen/);
  assert.match(rows[0]!.line, /from Sunday rolls/);
});

test("living minors are children under eighteen with a birth date", () => {
  const rows = livingMinors(
    [
      { id: "nora", displayName: "Nora Chen", birthDate: "2018-06-14", deathDate: null },
      { id: "lily", displayName: "Lily Chen", birthDate: "1984-07-21", deathDate: null },
      { id: "cousin", displayName: "A cousin", birthDate: null, deathDate: null },
    ],
    new Date("2026-09-22"),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, "nora");
  assert.equal(rows[0]?.age, 8);
});

test("missing pronunciations and who is where on a photograph", () => {
  assert.equal(saidAs("Eleanor Hart", "EL-uh-nor hart"), "Eleanor Hart (EL-uh-nor hart)");
  const missing = missingPronunciations([
    { displayName: "Rose Whitaker", pronunciation: null },
    { displayName: "Eleanor Hart", pronunciation: "EL-uh-nor hart" },
  ]);
  assert.equal(missing[0]?.displayName, "Rose Whitaker");
  const tags = [
    { id: "a", personId: "rose", name: "Rose Whitaker", x: 40, y: 30 },
    { id: "b", personId: "louis", name: "Louis Whitaker", x: null, y: null },
  ];
  assert.equal(placedOnPhoto(tags).length, 1);
  assert.equal(unlocatedTags(tags)[0]?.name, "Louis Whitaker");
});
