import assert from "node:assert/strict";
import { test } from "node:test";
import {
  householdsMissingScan,
  missingManifestHeading,
  missingScanHeading,
  scanHeading,
  scanLine,
  voyagesMissingManifest,
} from "../src/lib/scans";
import {
  applySuggestionValue,
  isSuggestionField,
  suggestionHeading,
  suggestionHistoryHeading,
  suggestionLine,
} from "../src/lib/suggestions";
import { compileTogether, marksFromHistory, twoLivesHeading, twoLivesLine } from "../src/lib/twoLives";
import { nameTagHeading, nameTagLine } from "../src/lib/nameTags";
import { journalHeading, journalLine, journalSharedHeading } from "../src/lib/journal";
import { chronicleHeading, compileChronicle, placeMatch } from "../src/lib/placeChronicle";
import { homeDuplicateHeading, mergeHomesHeading, suggestHomeDuplicates } from "../src/lib/homeDuplicates";
import { branchGedcomFilename, branchGedcomHeading, webcalHeading, webcalHref } from "../src/lib/webcal";

test("census and ship scans read like a relative labeled them", () => {
  assert.equal(scanHeading("census", "Cedar Falls, 1940"), "Census scan · Cedar Falls, 1940");
  assert.equal(scanHeading("manifest", "SS Eastern Star"), "Ship manifest · SS Eastern Star");
  assert.equal(scanLine("Hart picnic, 1961"), "Hart picnic, 1961");
  assert.equal(scanLine("  "), "A scan of the page");
  assert.equal(householdsMissingScan([{ assetId: "a" }, { assetId: null }]).length, 1);
  assert.equal(voyagesMissingManifest([{ assetId: "a" }, {}]).length, 1);
  assert.match(missingScanHeading(1), /1 household still needs/);
  assert.equal(missingScanHeading(0), "Every household has its scan");
  assert.match(missingManifestHeading(2), /2 voyages still need/);
});

test("a viewer correction names the field and the proposed value", () => {
  assert.equal(isSuggestionField("burialPlot"), true);
  assert.equal(isSuggestionField("ownerNote"), false);
  assert.equal(applySuggestionValue("displayName", " Eleanor Hart "), "Eleanor Hart");
  assert.ok(applySuggestionValue("birthDate", "1928-04-12") instanceof Date);
  assert.equal(applySuggestionValue("birthDate", "not-a-day"), null);
  assert.equal(suggestionHeading(0), "No corrections waiting");
  assert.equal(suggestionHeading(1), "1 correction to review");
  assert.match(suggestionHeading(3), /3 corrections/);
  assert.equal(suggestionLine({ name: "Eleanor Hart", field: "burialPlot", proposedValue: "Fairview" }), "Eleanor Hart: burialPlot → Fairview");
  assert.match(suggestionHistoryHeading(1), /1 correction already reviewed/);
});

test("two lives compile onto one chronological list", () => {
  const items = compileTogether(
    marksFromHistory(
      [{ id: "e1", title: "Born", href: "/people/ellie", happenedOn: "1928-04-12", people: [{ id: "ellie" }] }],
      "ellie",
      "Eleanor Hart",
    ),
    marksFromHistory(
      [{ id: "e2", title: "Arrived", href: "/voyages/1", happenedOn: "1972-03-22", people: [{ id: "wei" }] }],
      "wei",
      "Wei Chen",
    ),
  );
  assert.equal(items[0]?.who, "Eleanor Hart");
  assert.equal(items[1]?.who, "Wei Chen");
  assert.equal(twoLivesHeading("Eleanor Hart", "Wei Chen"), "Eleanor Hart and Wei Chen on one timeline");
  assert.equal(twoLivesLine(items[0]!), "Eleanor Hart · Born");
});

test("name tags, journal, place chronicle, homes, and webcal headings", () => {
  assert.equal(nameTagHeading("Hart reunion", 0), "No name tags yet for Hart reunion");
  assert.equal(nameTagHeading("Hart reunion", 1), "1 name tag for Hart reunion");
  assert.equal(nameTagLine("Lily Chen", "Hart reunion"), "Lily Chen · Hart reunion");
  assert.equal(journalHeading(0), "No private journal yet");
  assert.equal(journalHeading(1, 0), "1 journal entry still private");
  assert.equal(journalHeading(2, 2), "2 entries, all shared as stories");
  assert.equal(journalLine("Cider", false), "Cider · still private");
  assert.equal(journalSharedHeading(1), "1 journal entry shared as a story");
  assert.ok(placeMatch("Cedar Falls", "North farm, Cedar Falls"));
  assert.equal(placeMatch("Cedar Falls", "Hong Kong"), false);
  const chronicle = compileChronicle([
    { id: "2", kind: "voyage", title: "SS Eastern Star", href: "/voyages/1", date: "1972-03-04" },
    { id: "1", kind: "census", title: "Census 1940", href: "/households/1", date: "1940-01-01" },
  ]);
  assert.equal(chronicle[0]?.kind, "census");
  assert.match(chronicleHeading("Cedar Falls", 2), /2 things that happened/);
  const dups = suggestHomeDuplicates([
    { id: "a", title: "Whitaker house", line: "14 Market Street", locality: "Cedar Falls" },
    { id: "b", title: "The Whitaker house", line: "14 Market Street", locality: "Cedar Falls" },
    { id: "c", title: "North farm", line: "County road", locality: "Cedar Falls" },
  ]);
  assert.equal(dups.length, 1);
  assert.equal(dups[0]?.drop[0]?.id, "b");
  assert.equal(homeDuplicateHeading(1), "1 house looks duplicated");
  assert.equal(mergeHomesHeading("Whitaker house", "The Whitaker house"), "Merge The Whitaker house into Whitaker house");
  assert.equal(webcalHeading("Hart"), "Hart family dates");
  assert.equal(webcalHref("abc", "https://familylineage.app"), "webcal://familylineage.app/api/cal/abc");
  assert.equal(branchGedcomHeading("Cedar Falls Harts"), "GEDCOM · Cedar Falls Harts");
  assert.equal(branchGedcomFilename("Cedar Falls Harts"), "cedar-falls-harts.ged");
});
