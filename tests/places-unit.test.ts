import assert from "node:assert/strict";
import { test } from "node:test";
import { RelType } from "@prisma/client";
import {
  ancestorChain,
  descendantIds,
  filterPlacesWithin,
  nestPlaces,
  placeBreadcrumb,
  placeFilterHeading,
  placeGapHeading,
  placeKindLabel,
  placesMissingParent,
} from "../src/lib/placeTree";
import { letterDuplicateHeading, letterTokens, suggestLetterDuplicates, textOverlap } from "../src/lib/letterDuplicates";
import { compareHeading, compareHref, pairSamples } from "../src/lib/handwritingCompare";
import {
  anniversaryHeading,
  anniversaryLine,
  deathAnniversaries,
  milestoneBirthdays,
  milestoneHeading,
  milestoneLine,
  ageInYear,
} from "../src/lib/milestones";
import { buildPdf, pdfFilename } from "../src/lib/pdf";
import { hasWatermark, watermarkLabel, watermarkPhoto, watermarkSvg } from "../src/lib/watermark";
import { cousinWorksheet, cousinWorksheetHeading } from "../src/lib/cousinWorksheet";
import { dateRange, rangeBarStyle } from "../src/lib/dateRange";
import { adoptionHeading, adoptionLine } from "../src/lib/adoptionPaper";
import { neededHeading, peopleNeedingFirst, startHeading, startSteps } from "../src/lib/startHere";

const places = [
  { id: "us", name: "United States", kind: "country", parentId: null },
  { id: "ia", name: "Iowa", kind: "state", parentId: "us" },
  { id: "bh", name: "Black Hawk County", kind: "county", parentId: "ia" },
  { id: "cf", name: "Cedar Falls", kind: "city", parentId: "bh" },
  { id: "orphan", name: "Lost Town", kind: "city", parentId: null },
];

test("a city sits inside a county inside a state", () => {
  assert.equal(placeKindLabel("town"), "City");
  assert.equal(placeFilterHeading("Iowa"), "Inside Iowa");
  assert.deepEqual([...descendantIds(places, "ia")].sort(), ["bh", "cf", "ia"].sort());
  assert.equal(placeBreadcrumb(places, "cf"), "United States · Iowa · Black Hawk County · Cedar Falls");
  assert.equal(ancestorChain(places, "cf")[0]?.name, "United States");
  assert.equal(filterPlacesWithin(places, "bh").map((place) => place.id).join(","), "bh,cf");
  const tree = nestPlaces(places);
  const nation = tree.find((place) => place.name === "United States");
  assert.equal(nation?.children[0]?.name, "Iowa");
  assert.equal(nation?.children[0]?.children[0]?.name, "Black Hawk County");
  assert.equal(placesMissingParent(places)[0]?.name, "Lost Town");
  assert.match(placeGapHeading(1), /1 place/);
});

test("duplicate letters match the same people and date, or nearly the same text", () => {
  const letters = [
    {
      id: "a",
      title: "Harvest dance",
      writtenAt: "1947-10-18",
      transcript: "They danced three times and the cider was too sweet.",
      personIds: ["ellie", "sam"],
    },
    {
      id: "b",
      title: "Harvest dance copy",
      writtenAt: "1947-10-18",
      transcript: "A later typing.",
      personIds: ["sam", "ellie"],
    },
    {
      id: "c",
      title: "Nearly the same",
      writtenAt: "1948-01-01",
      transcript: "They danced three times and the cider was too sweet under the cottonwoods.",
      personIds: ["ellie"],
    },
  ];
  const pairs = suggestLetterDuplicates(letters);
  assert.equal(pairs[0]?.reason, "same people and date");
  assert.equal(pairs[0]?.score, 100);
  assert.ok(pairs.some((pair) => pair.reason === "nearly the same text"));
  assert.ok(letterTokens("Cider, cottonwoods.").includes("cider"));
  assert.ok(textOverlap(letters[0]!.transcript, letters[2]!.transcript) > 0.5);
  assert.match(letterDuplicateHeading(2), /2 possible/);
});

test("handwriting comparison names the two samples", () => {
  assert.equal(compareHeading("Eleanor Hart", "Samuel Hart"), "Eleanor Hart beside Samuel Hart");
  assert.equal(compareHref("a", "b"), "/handwriting/compare?a=a&b=b");
  assert.equal(pairSamples([{ id: "1", personName: "Eleanor", title: "loops" }]).length, 1);
});

test("milestone birthdays are the living who turn 80, 90, or 100", () => {
  const rows = milestoneBirthdays(
    [
      { id: "agnes", displayName: "Agnes Whitaker", birthDate: "1926-04-08" },
      { id: "dead", displayName: "Someone", birthDate: "1926-01-01", deathDate: "2000-01-01" },
      { id: "maya", displayName: "Maya Park", birthDate: "1983-01-30" },
    ],
    2026,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.displayName, "Agnes Whitaker");
  assert.equal(rows[0]?.age, 100);
  assert.equal(ageInYear("1946-02-02", 2026), 80);
  assert.equal(milestoneLine("Agnes Whitaker", 100, 2026), "Agnes Whitaker turns 100 in 2026");
  assert.match(milestoneHeading(2026, 1), /1 milestone/);
});

test("death anniversaries mark 10, 25, 50, and 100 years", () => {
  const rows = deathAnniversaries(
    [{ id: "rose", displayName: "Rose Whitaker", deathDate: "2001-11-02" }],
    2026,
  );
  assert.equal(rows[0]?.years, 25);
  assert.equal(anniversaryLine("Rose Whitaker", 25, 2026), "Rose Whitaker · 25 years in 2026");
  assert.match(anniversaryHeading(2026, 1), /1 death anniversary/);
});

test("the family book is a real PDF", () => {
  const pdf = buildPdf(
    [{ title: "Rose Whitaker", subtitle: "1929 – 2008", sections: [{ heading: "Vital dates", body: "Born in Cedar Falls." }] }],
    "Whitaker family book",
  );
  assert.ok(pdf.toString("utf8", 0, 5).startsWith("%PDF"));
  assert.match(pdf.toString("utf8"), /Rose Whitaker/);
  assert.equal(pdfFilename("Whitaker path"), "whitaker-path-book.pdf");
});

test("a share-link photo carries a family-only watermark", () => {
  const label = watermarkLabel("Whitaker path");
  assert.equal(label, "Whitaker path · family only");
  const svg = watermarkSvg("<svg></svg>", label);
  assert.match(svg, /family only/);
  const marked = watermarkPhoto(Buffer.from("<svg></svg>"), "image/svg+xml", label);
  assert.equal(marked.mimeType, "image/svg+xml");
  assert.ok(hasWatermark(marked.bytes, label));
});

test("the cousin worksheet lays children of siblings in columns", () => {
  const people = [
    { id: "rose", displayName: "Rose Whitaker" },
    { id: "helen", displayName: "Helen Park" },
    { id: "june", displayName: "June Whitaker" },
    { id: "maya", displayName: "Maya Park" },
    { id: "tom", displayName: "Tom Whitaker" },
  ];
  const relationships = [
    { fromPersonId: "rose", toPersonId: "helen", type: RelType.parent },
    { fromPersonId: "rose", toPersonId: "june", type: RelType.parent },
    { fromPersonId: "helen", toPersonId: "maya", type: RelType.parent },
    { fromPersonId: "june", toPersonId: "tom", type: RelType.parent },
  ];
  const sheet = cousinWorksheet("helen", people, relationships);
  assert.equal(cousinWorksheetHeading("Helen Park"), "Cousin worksheet · Helen Park");
  assert.deepEqual(sheet.columns.map((column) => column.siblingName), ["Helen Park", "June Whitaker"]);
  assert.equal(sheet.columns.find((column) => column.siblingName === "June Whitaker")?.children[0]?.name, "Tom Whitaker");
});

test("approximate dates are drawn as a range, not a single day", () => {
  const circa = dateRange("1947-10-18", "circa");
  assert.match(circa.label, /about 1947/);
  assert.equal(circa.start, "1946-10-18");
  assert.equal(circa.end, "1948-10-18");
  const span = dateRange("1947-10-01", "exact", "1947-10-31");
  assert.match(span.label, /1 October 1947/);
  assert.match(span.label, /31 October 1947/);
  const before = dateRange("1948-06-14", "before");
  assert.equal(before.openStart, true);
  const after = dateRange("1947-10-18", "after");
  assert.equal(after.openEnd, true);
  const bar = rangeBarStyle(circa, 1940, 1960);
  assert.match(bar.left, /%/);
  assert.match(bar.width, /%/);
});

test("an adoption paper names the child and the parent", () => {
  assert.equal(adoptionHeading("Peter Hart", "Robert Hart"), "Adoption paper · Peter Hart and Robert Hart");
  assert.match(adoptionLine("Peter Hart", "Robert Hart", "12 May 1994"), /adopted by/);
});

test("start-here tracks claim, one story, and one photograph", () => {
  const none = startSteps({ claimed: false, hasStory: false, hasPhoto: false });
  assert.equal(startHeading(none), "Start here");
  const done = startSteps({ claimed: true, hasStory: true, hasPhoto: true });
  assert.match(startHeading(done), /archive is yours/);
  assert.equal(peopleNeedingFirst([{ id: "a", displayName: "Agnes" }, { id: "b", displayName: "Rose" }], ["a"])[0]?.displayName, "Rose");
  assert.match(neededHeading(2, 1), /2 still need a story/);
});
