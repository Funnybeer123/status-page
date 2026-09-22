import assert from "node:assert/strict";
import { test } from "node:test";
import { isDeceased, livingWallHeading, memorialMissingHeading, memorialWallHeading } from "../src/lib/portraits";
import { compareHeading, compareSideLabel, editedLettersHeading, hasEdits, latestRevision } from "../src/lib/transcriptCompare";
import { missingOccupationsHeading, occupationLine, occupationTimelineHeading, sortOccupations } from "../src/lib/occupations";
import { pickTodayQuestion, todayAnswerSavedLine, todayQuestionHeading, unansweredQuestionsHeading } from "../src/lib/todayQuestion";
import { recentsHeading, recentLine, sortRecents } from "../src/lib/recents";
import { clusterSchools, schoolMapHeading, schoolPinLine, unmappedSchoolsHeading } from "../src/lib/schoolMap";
import { boxFileManyLine } from "../src/lib/box";
import {
  formatStyledDate,
  formatStyledName,
  nameStyleLabel,
  resolveDateStyle,
  resolveNameStyle,
  styleExampleLine,
  styleSheetHeading,
} from "../src/lib/styleSheet";
import { attachYearCredits, compileThisYear, yearCreditLine } from "../src/lib/thisYear";
import { cleanedCopyLabel, originalScanLabel, restoreHeading, restorePairHeading } from "../src/lib/restore";
import { compileLifeStory } from "../src/lib/book";
import { compileGroupSheet } from "../src/lib/groupSheet";

test("the memorial wall stays separate from the living wall", () => {
  assert.equal(isDeceased({ deathDate: "2008-11-02" }), true);
  assert.equal(isDeceased({ deathDate: null }), false);
  assert.equal(memorialWallHeading(0), "No memorial portraits yet");
  assert.equal(memorialWallHeading(2), "2 memorial portraits");
  assert.equal(livingWallHeading(1), "1 living portrait");
  assert.equal(memorialMissingHeading(0), "Every memorial has a portrait");
});

test("side-by-side transcripts pick the latest earlier version", () => {
  assert.equal(compareHeading(), "Side-by-side transcript");
  assert.equal(compareSideLabel("current"), "Current transcript");
  assert.equal(compareSideLabel("earlier"), "Earlier transcript");
  assert.equal(hasEdits([]), false);
  assert.equal(hasEdits([{ editedAt: "2026-02-14" }]), true);
  const latest = latestRevision([
    { editedAt: "2026-01-01", transcript: "first" },
    { editedAt: "2026-03-01", transcript: "later" },
  ]);
  assert.equal(latest?.transcript, "later");
  assert.equal(editedLettersHeading(1), "1 letter has an earlier transcript");
});

test("an occupation timeline stays in the order the work happened", () => {
  assert.match(occupationTimelineHeading("Samuel Hart", 2), /2 occupations on Samuel Hart/);
  assert.equal(occupationLine("Beekeeper", "North farm", "1988-06-01", null), "Beekeeper · North farm · 1988–");
  const sorted = sortOccupations([
    { startedOn: "1988-06-01", title: "Beekeeper" },
    { startedOn: "1948-06-14", title: "Farmer" },
  ]);
  assert.equal(sorted[0]?.title, "Farmer");
  assert.equal(missingOccupationsHeading(1), "1 person still needs an occupation");
});

test("today’s question, recents, schools, and filing several uploads", () => {
  assert.equal(todayQuestionHeading("How did the grandparents meet?"), "Today’s question · How did the grandparents meet?");
  assert.match(todayAnswerSavedLine("How did the grandparents meet?"), /Saved as a story/);
  assert.equal(unansweredQuestionsHeading(0), "Every family question has an answer");
  const picked = pickTodayQuestion(
    [
      { id: "a", answers: [{ id: "1" }] },
      { id: "b", answers: [] },
    ],
    new Date("2026-09-22"),
  );
  assert.equal(picked?.id, "b");
  assert.equal(recentsHeading(2), "2 recently opened people");
  assert.equal(recentLine("Rose Whitaker"), "Rose Whitaker");
  assert.equal(sortRecents([{ openedAt: "2026-01-01" }, { openedAt: "2026-09-01" }])[0]?.openedAt, "2026-09-01");
  assert.equal(schoolMapHeading(1), "1 school on the map");
  assert.match(schoolPinLine("Cedar Falls High", "Cedar Falls", 1), /Cedar Falls High/);
  const clusters = clusterSchools([
    { id: "s1", school: "Cedar Falls High", place: "Cedar Falls, Iowa", person: { id: "e", displayName: "Eleanor Hart" } },
  ]);
  assert.equal(clusters[0]?.school, "Cedar Falls High");
  assert.equal(unmappedSchoolsHeading(0), "Every school has a place on the map");
  assert.equal(boxFileManyLine(2, "June Whitaker"), "2 uploads filed onto June Whitaker");
});

test("the style sheet writes names and dates the way the family asked", () => {
  assert.equal(resolveNameStyle(null), "display");
  assert.equal(resolveDateStyle(null), "day-month-year");
  assert.equal(formatStyledName({ displayName: "Eleanor Hart", givenName: "Eleanor", familyName: "Hart" }, "family-given"), "Hart, Eleanor");
  assert.equal(formatStyledName({ displayName: "Ellie", givenName: "Eleanor", familyName: "Hart" }, "given-family"), "Eleanor Hart");
  assert.equal(formatStyledDate("1948-06-14", "day-month-year"), "14 June 1948");
  assert.equal(formatStyledDate("1948-06-14", "month-day-year"), "June 14, 1948");
  assert.equal(formatStyledDate("1948-06-14", "year-only"), "1948");
  assert.equal(styleSheetHeading(), "Family style sheet");
  assert.match(nameStyleLabel("family-given"), /Family name/);
  assert.equal(styleExampleLine("Hart, Eleanor", "14 June 1948"), "Hart, Eleanor · 14 June 1948");
  const chapter = compileLifeStory({
    person: { id: "e", displayName: "Ellie", givenName: "Eleanor", familyName: "Hart", birthDate: "1928-04-12", deathDate: "2015-01-03", notes: null },
    names: [],
    residences: [],
    events: [],
    letters: [],
    stories: [],
    style: { nameStyle: "family-given", dateStyle: "year-only" },
  });
  assert.equal(chapter.title, "Hart, Eleanor");
  assert.match(chapter.sections[0]?.body || "", /Born 1928/);
  const sheet = compileGroupSheet(
    "rose",
    [
      { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { id: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
    ],
    [{ type: "partner", fromPersonId: "rose", toPersonId: "louis" }],
    [{ personId: "rose", otherPersonId: "louis", kind: "marriage", happenedOn: "1953-05-01" }],
    { dateStyle: "year-only" },
  );
  assert.equal(sheet?.marriage?.date, "1953");
});

test("year credits attach only when an activity matches, and a restore pair has two sides", () => {
  const items = compileThisYear({
    year: 2026,
    people: [],
    stories: [{ id: "s1", title: "Sunday rolls from Maya", recordedAt: "2026-03-12" }],
    photos: [],
  });
  assert.equal(items[0]?.credit, undefined);
  const credited = attachYearCredits(items, [{ entityId: "s1", title: "Sunday rolls from Maya", actorName: "Maya Park" }]);
  assert.equal(credited[0]?.credit, "Added by Maya Park");
  assert.equal(yearCreditLine("Lily Chen"), "Added by Lily Chen");
  assert.equal(attachYearCredits(items, [])[0]?.credit, undefined);
  assert.equal(restoreHeading("Hart picnic, 1961"), "Restoration pair · Hart picnic, 1961");
  assert.equal(restorePairHeading(1), "1 restoration pair");
  assert.equal(originalScanLabel(), "Original scan");
  assert.equal(cleanedCopyLabel(), "Cleaned copy");
});
