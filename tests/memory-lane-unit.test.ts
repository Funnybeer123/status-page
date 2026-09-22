import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import { compileMemoryLane, memoryLaneHeading, memoryLaneStopLine, missingLaneHeading, pickLanePhoto } from "../src/lib/memoryLane";
import { compileCrossword, crosswordBlank, crosswordCiteLine, crosswordHeading, emptyCrosswordHeading } from "../src/lib/crossword";
import { hasWeather, missingWeatherHeading, weatherNoteLine } from "../src/lib/weatherNote";
import { borrowedFromLine, hasBorrowedCredit, uncreditedHeading } from "../src/lib/borrowedFrom";
import { filmCaptionLine, missingCaptionsHeading, sortFilmCaptions } from "../src/lib/filmCaptions";
import { addressBookHeading, addressBookLine, compileAddressBook, missingAddressHeading } from "../src/lib/addressBook";
import { hiddenSecretBody, isSecretLocked, isoDateOnly, secretUntilLine, secretUnlocksToday } from "../src/lib/secretUntil";
import { branchColorLine, branchLegendHeading, normalizeBranchColor, uncoloredBranchesHeading } from "../src/lib/branchColor";
import { clampOcrConfidence, needsOcrConfidence, ocrConfidenceLine } from "../src/lib/ocrConfidence";
import { compileDayDigest, digestHeading, digestSubject, emptyDigestHeading, movedAwayLine } from "../src/lib/dayDigest";
import { remindersToday } from "../src/lib/reminders";

test("memory lane walks places in the order a person lived there", () => {
  assert.equal(memoryLaneHeading("Eleanor Hart"), "Memory lane · Eleanor Hart");
  assert.match(memoryLaneStopLine("Cedar Falls", "1928-03-12", "1948-06-14"), /Cedar Falls · 1928–1948/);
  assert.equal(missingLaneHeading(1), "1 person still needs a place on memory lane");
  const stops = compileMemoryLane(
    [
      {
        id: "farm",
        startedAt: "1948-06-14",
        endedAt: "2015-06-03",
        place: { id: "place-farm", name: "North farm", photos: [{ id: "picnic", title: "Hart picnic, 1961" }] },
      },
      {
        id: "cedar",
        startedAt: "1928-03-12",
        endedAt: "1948-06-14",
        place: { id: "place-cedar", name: "Cedar Falls", photos: [] },
      },
    ],
    [{ id: "porch", title: "Whitaker porch", placeId: "place-cedar" }],
  );
  assert.equal(stops[0]?.placeName, "Cedar Falls");
  assert.equal(stops[0]?.photoId, "porch");
  assert.equal(stops[1]?.photoId, "picnic");
  assert.equal(pickLanePhoto("place-cedar", [], [{ id: "porch", placeId: "place-cedar" }])?.id, "porch");
});

test("a family crossword cites the letter or story it came from", () => {
  assert.equal(crosswordHeading(2), "Family crossword · 2 clues");
  assert.equal(emptyCrosswordHeading(), "No letters or stories to draw clues from");
  assert.equal(crosswordCiteLine("Harvest letter"), "Cited from Harvest letter");
  assert.match(crosswordBlank("CIDER"), /_/);
  const clues = compileCrossword([
    {
      id: "doc-harvest",
      title: "Harvest letter",
      kind: "letter",
      body: "The Grange hall held its harvest dance, the cider was too sweet, and he walked her home past the cottonwoods.",
      href: "/letters/doc-harvest",
    },
  ]);
  assert.ok(clues.some((clue) => clue.answer === "CIDER"));
  assert.ok(clues.some((clue) => clue.answer === "COTTONWOODS"));
  assert.ok(clues.every((clue) => clue.href === "/letters/doc-harvest"));
});

test("a weather note remembers what the family said about that day", () => {
  assert.equal(hasWeather({ weather: "A hard frost" }), true);
  assert.equal(hasWeather({}), false);
  assert.match(weatherNoteLine("A hard frost, then a clear night", "1947-10-18"), /18 October 1947/);
  assert.equal(missingWeatherHeading(1), "1 dated photo or letter still needs a weather note");
});

test("a borrowed-from credit names the other album", () => {
  assert.equal(hasBorrowedCredit({ borrowedFromAlbumId: "album-harvest" }), true);
  assert.equal(borrowedFromLine("Harvest years"), "Borrowed from Harvest years");
  assert.equal(uncreditedHeading(2), "2 photographs still need a borrowed-from credit");
});

test("silent film captions stay in time order", () => {
  assert.match(filmCaptionLine(83, "Mother cuts the Sunday rolls"), /1:23/);
  assert.equal(missingCaptionsHeading(1), "1 film still needs a caption track");
  const sorted = sortFilmCaptions([
    { id: "later", seconds: 83, text: "How they met" },
    { id: "first", seconds: 12, text: "Sunday rolls" },
  ]);
  assert.deepEqual(sorted.map((row) => row.id), ["first", "later"]);
});

test("the address book lists living relatives and hides minors from viewers", () => {
  assert.equal(addressBookHeading(2), "Address book · 2 living relatives");
  assert.equal(addressBookLine("Lily Chen", "14 Market Street", "319-555-1947"), "Lily Chen · 14 Market Street · 319-555-1947");
  assert.equal(missingAddressHeading(1), "1 living relative still needs an address");
  const items = compileAddressBook(
    [
      { id: "lily", displayName: "Lily Chen", deathDate: null, birthDate: "1984-06-02" },
      { id: "ellie", displayName: "Eleanor Hart", deathDate: "2015-06-03", birthDate: "1928-03-12" },
      { id: "child", displayName: "Baby Hart", deathDate: null, birthDate: "2020-01-01" },
    ],
    [{ personId: "lily", line: "14 Market Street", locality: "Cedar Falls" }],
    [{ personId: "lily", phone: "319-555-1947" }],
    Role.viewer,
  );
  assert.equal(items.length, 1);
  assert.match(items[0]?.printed || "", /14 Market Street/);
});

test("kept-secret dates compare the day only", () => {
  assert.equal(isoDateOnly("2030-01-01T12:00:00Z"), "2030-01-01");
  assert.equal(isSecretLocked("2030-01-01", new Date("2026-09-22T12:00:00Z")), true);
  assert.equal(isSecretLocked("1948-10-18", new Date("2026-09-22")), false);
  assert.equal(secretUnlocksToday("2026-09-22", new Date("2026-09-22T18:00:00Z")), true);
  assert.match(secretUntilLine("2030-01-01", new Date("2026-09-22")), /Kept secret until 2030-01-01/);
  assert.match(hiddenSecretBody(), /stays closed/);
});

test("branch colors make a legend for the tree", () => {
  assert.equal(normalizeBranchColor("#4d5b3c"), "#4d5b3c");
  assert.equal(normalizeBranchColor("cedar-green"), "cedar-green");
  assert.equal(normalizeBranchColor("???"), null);
  assert.equal(branchColorLine("the Cedar Falls Harts", "#4d5b3c"), "the Cedar Falls Harts · #4d5b3c");
  assert.equal(branchLegendHeading(1), "1 branch color on the tree");
  assert.equal(uncoloredBranchesHeading(1), "1 branch still needs a color");
});

test("an OCR confidence score stays between 0 and 100", () => {
  assert.equal(clampOcrConfidence(62), 62);
  assert.equal(clampOcrConfidence(140), 100);
  assert.match(ocrConfidenceLine(62), /needs a second look/);
  assert.equal(needsOcrConfidence({ needsReview: true, ocrConfidence: null }), true);
  assert.equal(needsOcrConfidence({ needsReview: true, ocrConfidence: 62 }), false);
});

test("the start-of-the-day digest lists what is due today", () => {
  assert.equal(digestHeading(2), "Start of the day · 2 things due today");
  assert.equal(emptyDigestHeading(), "Nothing due at the start of the day");
  assert.match(digestSubject("Whitaker then-now", 1), /1 thing due today/);
  const items = compileDayDigest({
    reminders: [
      { id: "today", title: "Birthday · June Whitaker", daysUntil: 0, personId: "june", monthDay: "22 September" },
      { id: "later", title: "Birthday · Rose", daysUntil: 3, personId: "rose" },
    ],
    reunions: [{ id: "reunion", title: "Hart reunion", happenedOn: "2026-09-22" }],
    secrets: [{ id: "secret", title: "For Lily, not yet", secretUntil: "2026-09-22", href: "/letters/secret" }],
    from: new Date("2026-09-22T08:00:00Z"),
  });
  assert.equal(items.length, 3);
  assert.ok(items.some((item) => /June Whitaker/.test(item.title)));
  assert.ok(items.some((item) => item.kind === "reunion"));
  assert.ok(items.some((item) => item.kind === "secret"));
  assert.equal(remindersToday([{ daysUntil: 0 }, { daysUntil: 1 }] as never[]).length, 1);
  assert.match(movedAwayLine("Eleanor Hart", "Cedar Falls", "1948"), /left Cedar Falls in 1948/);
});
