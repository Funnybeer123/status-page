import assert from "node:assert/strict";
import { test } from "node:test";
import { clueAnswerHref, clueCitationLine, emptyHuntsHeading, huntHeading, huntsIndexHeading } from "../src/lib/hunt";
import { placePinLine, placePinsHeading, unpinnedLettersHeading } from "../src/lib/placePin";
import { birthOrder, birthOrderHeading, birthOrderLine, missingBirthDatesHeading } from "../src/lib/birthOrder";
import { coupleLine, sameCalendarDay, weddingPartyHeading, weddingPhotosHeading, witnessLine } from "../src/lib/weddingParty";
import { contemporaryLine, contemporariesHeading, overlappingResidents } from "../src/lib/contemporaries";
import { compileNewsletter } from "../src/lib/newsletter";
import { draftHeading, draftStatus, withDraft } from "../src/lib/newsletterDraft";
import { bothNamesHeading, nameSearchExcerpt } from "../src/lib/nameSearch";
import { checklistHeading, checklistItemLine, usualDocumentTypes } from "../src/lib/researchChecklist";
import { aloudParagraphs, readAloudHeading } from "../src/lib/readAloud";
import { homeMottoHeading, pickHomeMotto } from "../src/lib/homeMotto";

test("a scavenger hunt clue cites the letter, photograph, or place in the archive", () => {
  assert.match(huntHeading("Harvest hunt", 3), /3 clues/);
  assert.equal(huntsIndexHeading(1), "1 family scavenger hunt");
  assert.equal(emptyHuntsHeading(0), "Every hunt has a clue");
  assert.match(
    clueCitationLine({
      clue: "She wrote to Ruth",
      targetKind: "letter",
      answer: "The harvest letter",
      documentTitle: "Letter: Eleanor to Ruth",
    }),
    /Cited from the archive: Letter: Eleanor to Ruth/,
  );
  assert.equal(clueAnswerHref({ targetKind: "letter", documentId: "doc-1" }), "/letters/doc-1");
});

test("a letter or story can be pinned to one place on the map", () => {
  assert.equal(placePinLine("Harvest letter", "Grange hall"), "Harvest letter pinned at Grange hall");
  assert.match(placePinsHeading(2), /2 letters or stories pinned/);
  assert.equal(unpinnedLettersHeading(0), "Every letter is pinned to a place");
});

test("siblings line up in birth order", () => {
  const ordered = birthOrder([
    { id: "june", displayName: "June Whitaker", birthDate: "1956-04-01" },
    { id: "helen", displayName: "Helen Whitaker", birthDate: "1954-09-12" },
    { id: "undated", displayName: "Baby Whitaker", birthDate: null },
  ]);
  const fromDates = birthOrder([
    { id: "june", displayName: "June Whitaker", birthDate: new Date("1956-04-01T00:00:00Z") },
    { id: "helen", displayName: "Helen Whitaker", birthDate: new Date("1954-09-12T00:00:00Z") },
  ]);
  assert.equal(ordered[0]?.displayName, "Helen Whitaker");
  assert.equal(fromDates[0]?.displayName, "Helen Whitaker");
  assert.equal(ordered[0]?.order, 1);
  assert.equal(ordered[2]?.displayName, "Baby Whitaker");
  assert.match(birthOrderHeading("June Whitaker", 3), /Birth order/);
  assert.match(birthOrderLine(1, "Helen Whitaker", "12 September 1954"), /1\. Helen Whitaker/);
  assert.equal(missingBirthDatesHeading(1), "1 sibling still needs a birth date");
});

test("a wedding party names the couple, the witnesses, and photographs of that day", () => {
  assert.equal(sameCalendarDay("1948-06-14T14:00:00Z", "1948-06-14"), true);
  assert.equal(sameCalendarDay("1948-06-14T14:00:00Z", "1961-07-04"), false);
  assert.match(weddingPartyHeading("Rose Whitaker", "Louis Whitaker"), /Rose Whitaker and Louis Whitaker/);
  assert.equal(coupleLine("Rose Whitaker", "Louis Whitaker"), "Rose Whitaker and Louis Whitaker");
  assert.equal(witnessLine("June Whitaker", "witness"), "June Whitaker · witness");
  assert.equal(weddingPhotosHeading(1), "1 photograph of that day");
});

test("who lived in a place at the same time is an overlap of residence years", () => {
  const pairs = overlappingResidents([
    { id: "a", personId: "rose", personName: "Rose Whitaker", startedAt: "1948-06-14", endedAt: "2008-11-02" },
    { id: "b", personId: "louis", personName: "Louis Whitaker", startedAt: "1946-01-01", endedAt: "2011-01-14" },
    { id: "c", personId: "maya", personName: "Maya Park", startedAt: "1983-01-30", endedAt: null },
  ]);
  assert.ok(pairs.some((pair) => /Rose Whitaker/.test(pair.line) && /Louis Whitaker/.test(pair.line)));
  assert.equal(contemporaryLine("Rose", "Louis"), "Rose lived here at the same time as Louis");
  assert.match(contemporariesHeading("Cedar Falls", 1), /1 pair lived at Cedar Falls/);
});

test("a newsletter draft can be edited without changing the compiled month", () => {
  const compiled = compileNewsletter(
    [{ id: "1", title: "Rose Whitaker", href: "/people/rose", when: "2026-09-04T12:00:00Z", kind: "person" }],
    "2026-09",
  );
  assert.match(compiled.heading, /September 2026 family newsletter/);
  const withIt = withDraft(compiled, { id: "d1", month: "2026-09", body: "Dear family —", publishedAt: null });
  assert.equal(withIt.items.length, compiled.items.length);
  assert.equal(withIt.draft?.status, "Draft — edit before it goes out");
  assert.match(draftHeading("2026-09"), /Draft of the September 2026 family newsletter/);
  assert.equal(draftStatus("2026-09-22"), "Sent to the family");
});

test("search, checklist, read-aloud, and the home motto keep family wording", () => {
  assert.match(nameSearchExcerpt("Eleanor Hart", "Eleanor Whitaker"), /also Eleanor Whitaker/);
  assert.match(bothNamesHeading(1), /maiden name and married name/);
  assert.equal(usualDocumentTypes().length, 8);
  assert.ok(usualDocumentTypes().some((item) => item.kind === "census"));
  assert.match(checklistHeading(0), /8 usual document types/);
  assert.equal(checklistItemLine("Letter", false), "Letter · still to find");
  assert.equal(readAloudHeading("Harvest letter"), "Read aloud: Harvest letter");
  assert.equal(aloudParagraphs("Dear Ruth\n\nThe cider was too sweet.").length, 2);
  assert.equal(homeMottoHeading(), "Family motto");
  assert.equal(pickHomeMotto([{ id: "a", text: "First" }, { id: "b", text: "Preferred", preferred: true }])?.text, "Preferred");
});
