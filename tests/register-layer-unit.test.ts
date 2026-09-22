import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compileMissingMarried,
  compileYearsMarried,
  longestMarriageHeading,
  marriedHeading,
  marriedLine,
  marriageEndDate,
  missingMarriedHeading,
  yearsBetween,
  yearsMarried,
  yearsMarriedLabel,
} from "../src/lib/marriedYears";
import {
  compileMarginNotes,
  letterLines,
  letterMarginsHeading,
  marginNoteLine,
  marginsHeading,
  missingMarginsHeading,
} from "../src/lib/marginNotes";
import { compileWillWitnesses, missingWillWitnessesHeading, willWitnessLine, willWitnessesHeading } from "../src/lib/willWitnesses";
import { compileNamedBy, givenNamesHeading, missingNamedByHeading, namedByLine } from "../src/lib/namedBy";
import { compileCrests, crestLine, crestsHeading, missingCrestHeading } from "../src/lib/familyCrest";
import { compileOriginals, holderLine, missingOriginalsHeading, originalsHeading } from "../src/lib/originalHolder";
import { compilePhrases, missingPhrasesHeading, phraseLine, phrasesHeading } from "../src/lib/phrasebook";
import { compileProgram, missingProgramsHeading, programHeading, programLine, programSortKey } from "../src/lib/reunionProgram";
import { compileSitters, missingSittersHeading, sitterLine, sittersHeading } from "../src/lib/portraitSitter";
import { compileMiddles, compileMissingMiddles, hasMiddleName, middleNameLine, middlesHeading, missingMiddlesHeading } from "../src/lib/middleNames";
import { compilePaperMills, hasPaperMill, missingPaperHeading, paperHeading, paperMillLine } from "../src/lib/paperMill";
import { startSteps } from "../src/lib/startHere";
import { quietNavLinks } from "../src/lib/quietMode";

test("years married count from the wedding day to today, a parting, or the first death", () => {
  assert.equal(yearsBetween("1948-06-14", "2015-06-03"), 66);
  assert.equal(yearsMarried("1948-06-14", "2015-06-03"), 66);
  assert.equal(yearsMarried(null), null);
  assert.equal(yearsMarriedLabel(66), "66 years married");
  assert.equal(yearsMarriedLabel(1), "1 year married");
  assert.equal(yearsMarriedLabel(0), "married this year");
  assert.equal(marriedLine("Eleanor Hart", "Samuel Hart", 66), "Eleanor Hart and Samuel Hart · 66 years married");
  assert.equal(marriedHeading(2), "2 couples on the wedding-year roll");
  assert.equal(missingMarriedHeading(1), "1 couple still needs a wedding date");
  const end = marriageEndDate(
    { endedAt: null },
    { deathDate: "2015-06-03" },
    { deathDate: "2018-01-19" },
    "2026-09-22",
  );
  assert.equal(String(end).startsWith("2015-06-03") || new Date(end).toISOString().startsWith("2015-06-03"), true);
  const rows = compileYearsMarried(
    [
      { id: "e", displayName: "Eleanor Hart", deathDate: "2015-06-03" },
      { id: "s", displayName: "Samuel Hart", deathDate: "2018-01-19" },
      { id: "m", displayName: "Margaret Chen" },
      { id: "w", displayName: "Wei Chen" },
    ],
    [
      { id: "es", fromPersonId: "e", toPersonId: "s", type: "partner", startedAt: "1948-06-14" },
      { id: "mw", fromPersonId: "m", toPersonId: "w", type: "partner", startedAt: "1981-09-05" },
    ],
    "2026-09-22",
  );
  assert.equal(rows[0]?.aName, "Eleanor Hart");
  assert.equal(rows[0]?.years, 66);
  assert.equal(rows[1]?.years, 45);
  assert.match(longestMarriageHeading(rows[0]), /66 years married/);
  const missing = compileMissingMarried(
    [{ id: "n", displayName: "Cousin Ned" }, { id: "j", displayName: "June Whitaker" }],
    [{ id: "nj", fromPersonId: "n", toPersonId: "j", type: "partner" }],
  );
  assert.equal(missing.length, 1);
});

test("margin notes pin a short comment to a letter line", () => {
  const lines = letterLines("Cedar Falls, Iowa\n18 October 1947\n\nDearest Ruth,");
  assert.equal(lines[0], "Cedar Falls, Iowa");
  assert.equal(lines.length, 4);
  assert.equal(marginNoteLine(8, "Lily Chen", "Mother still told it this way."), "Line 8 · Lily Chen · Mother still told it this way.");
  assert.equal(marginsHeading("Harvest letter", 1), "1 margin note on Harvest letter");
  assert.equal(letterMarginsHeading(2), "2 letters with margin notes");
  assert.equal(missingMarginsHeading(1), "1 letter still needs a margin note");
  const notes = compileMarginNotes([
    { id: "b", line: 8, body: "Whitaker", author: "Lily Chen" },
    { id: "a", line: 6, body: "Cottonwoods", author: "Margaret Chen" },
  ]);
  assert.equal(notes[0]?.line, 6);
});

test("will witnesses stand on a date beside the will", () => {
  assert.equal(willWitnessLine("Margaret Chen", "2 November 2017"), "Margaret Chen stood on 2 November 2017");
  assert.equal(willWitnessesHeading(2), "2 will witnesses");
  assert.equal(missingWillWitnessesHeading(1), "1 will still needs a witness");
  const rows = compileWillWitnesses([
    { id: "r", will: "Samuel’s will", witness: "Robert Hart", stoodOn: "2017-11-02" },
    { id: "m", will: "Samuel’s will", witness: "Margaret Chen", stoodOn: "2017-11-02" },
  ]);
  assert.equal(rows[0]?.witness, "Margaret Chen");
});

test("who named the child is separate from the nickname board", () => {
  assert.equal(namedByLine("Lily", "Margaret Chen"), "Lily · named by Margaret Chen");
  assert.equal(givenNamesHeading(1), "1 name with who chose it");
  assert.equal(missingNamedByHeading(1), "1 name still needs who chose it");
  const rows = compileNamedBy([
    { id: "2", name: "Rose", child: "Rose Whitaker", namedBy: "June Whitaker", childId: "r" },
    { id: "1", name: "Lily", child: "Lily Chen", namedBy: "Margaret Chen", childId: "l" },
  ]);
  assert.equal(rows[0]?.child, "Lily Chen");
});

test("a family crest keeps the blazon in words", () => {
  assert.match(crestLine("Hart arms", "Argent, a cottonwood proper"), /cottonwood/);
  assert.equal(crestsHeading(1), "1 family crest");
  assert.equal(missingCrestHeading(1), "This family still needs a crest");
  assert.equal(compileCrests([{ id: "b", title: "Rowe", blazon: "Or" }, { id: "a", title: "Hart arms", blazon: "Argent" }])[0]?.title, "Hart arms");
});

test("the original holder is who keeps the physical page", () => {
  assert.equal(holderLine("Harvest letter", "Margaret Chen"), "Harvest letter · held by Margaret Chen");
  assert.equal(originalsHeading(1), "1 original with a holder");
  assert.equal(missingOriginalsHeading(1), "1 letter still needs who holds the original");
  assert.equal(compileOriginals([{ id: "h", title: "Harvest letter", holder: "Margaret Chen" }])[0]?.holder, "Margaret Chen");
});

test("the phrasebook stores a saying and what it means", () => {
  assert.equal(phraseLine("He called me Whitaker", "A compliment"), "He called me Whitaker · A compliment");
  assert.equal(phrasesHeading(1), "1 family phrase");
  assert.equal(missingPhrasesHeading(1), "The phrasebook is still empty");
  assert.equal(compilePhrases([{ id: "a", phrase: "Whitaker", meaning: "A compliment" }])[0]?.phrase, "Whitaker");
});

test("a reunion program sorts morning before noon", () => {
  assert.equal(programSortKey("morning"), "09:00");
  assert.equal(programSortKey(null), "9999");
  assert.match(programLine("Grace", "Margaret Chen", "noon"), /Grace/);
  assert.match(programHeading("Harvest supper", 2), /2 items/);
  assert.equal(missingProgramsHeading(1), "1 reunion still needs a program");
  const items = compileProgram([
    { id: "g", title: "Grace", startsAt: "noon", personName: "Margaret Chen" },
    { id: "w", title: "Welcome", startsAt: "morning", personName: "Lily Chen" },
  ]);
  assert.equal(items[0]?.title, "Welcome");
});

test("a portrait sitter is one credited sitter, not every tagged face", () => {
  assert.equal(sitterLine("Eleanor Hart, about 1948", "Eleanor Hart"), "Eleanor Hart sat for Eleanor Hart, about 1948");
  assert.equal(sittersHeading(1), "1 portrait with a sitter");
  assert.equal(missingSittersHeading(1), "1 portrait still needs a sitter");
  assert.equal(compileSitters([{ id: "p", title: "About 1948", sitter: "Eleanor Hart" }])[0]?.sitter, "Eleanor Hart");
});

test("middle names stay off the missing-birth-date dashboard", () => {
  assert.equal(hasMiddleName({ middleName: "Mae" }), true);
  assert.equal(middleNameLine({ id: "e", displayName: "Eleanor Hart", givenName: "Eleanor", middleName: "Mae", familyName: "Hart" }), "Eleanor Mae Hart");
  assert.equal(middlesHeading(1), "1 middle name");
  assert.equal(missingMiddlesHeading(1), "1 person still needs a middle name");
  assert.equal(compileMiddles([{ id: "e", displayName: "Eleanor Hart", middleName: "Mae" }]).length, 1);
  assert.equal(compileMissingMiddles([{ id: "r", displayName: "Robert Hart" }])[0]?.displayName, "Robert Hart");
});

test("a letter paper mill is separate from postage and the fold", () => {
  assert.equal(hasPaperMill({ paperMill: "Crane & Co., Dalton" }), true);
  assert.equal(paperMillLine("Crane & Co., Dalton"), "Paper mill · Crane & Co., Dalton");
  assert.equal(paperHeading(1), "1 letter with a paper mill");
  assert.equal(missingPaperHeading(1), "1 letter still needs a paper mill");
  assert.equal(compilePaperMills([{ id: "h", title: "Harvest letter", paperMill: "Crane & Co., Dalton" }])[0]?.title, "Harvest letter");
});

test("quiet nav and start-here stay the same", () => {
  assert.equal(startSteps({ claimed: true, hasStory: true, hasPhoto: true }).length, 3);
  assert.deepEqual(
    quietNavLinks().map((link) => link.href),
    ["/", "/tree", "/ask", "/quiet"],
  );
});
