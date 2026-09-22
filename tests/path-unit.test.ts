import assert from "node:assert/strict";
import { test } from "node:test";
import { RelType } from "@prisma/client";
import { howRelated } from "../src/lib/related";
import { pathChainLabel, pathNodes, renderPathSvg } from "../src/lib/pathVisual";
import { censusOccupations, compareHeading, compareHouseholds, householdHeading, householdKey, memberLine } from "../src/lib/censusCompare";
import { compileRegisterLines, normalizeRegisterKind, registerHeading, registerLineText } from "../src/lib/registerExtract";
import { compileTaxNames, taxListHeading, taxNameLine } from "../src/lib/taxList";
import { compilePassengerList, passengerLine, voyagePassengerHeading } from "../src/lib/passengers";
import { posterGroupLine, posterHeading } from "../src/lib/treePoster";
import { savedSearchHeading, savedSearchHref, savedSearchTitle } from "../src/lib/savedSearch";
import { photoNoteHeading, photoNoteStyle } from "../src/lib/photoNotes";
import { compileLifeReading, lifeReadingHeading } from "../src/lib/lifeReading";
import { consentHeading, grantedConsentIds, livingAdultsNeedingConsent, needsShareConsent } from "../src/lib/consent";
import { hideAdultWithoutConsent, hidePhotoFromAudience, isLivingAdult } from "../src/lib/privacy";
import { Role } from "@prisma/client";

const people = [
  { id: "rose", displayName: "Rose Whitaker" },
  { id: "helen", displayName: "Helen Park" },
  { id: "maya", displayName: "Maya Park" },
];
const relationships = [
  { fromPersonId: "rose", toPersonId: "helen", type: RelType.parent },
  { fromPersonId: "helen", toPersonId: "maya", type: RelType.parent },
];

test("the visual path is the chain of people, not only the label", () => {
  const related = howRelated(people, relationships, "maya", "rose");
  const nodes = pathNodes(related);
  assert.deepEqual(nodes.map((node) => node.name), ["Maya Park", "Helen Park", "Rose Whitaker"]);
  assert.equal(pathChainLabel(related), "Maya Park → Helen Park → Rose Whitaker");
  const svg = renderPathSvg(nodes, related.steps);
  assert.match(svg, /Maya Park/);
  assert.match(svg, /Helen Park/);
  assert.match(svg, /child of/);
});

test("census comparison marks who stayed, arrived, and left", () => {
  const earlier = [
    { personId: "eleanor", name: "Eleanor Hart", role: "daughter", age: 12 },
  ];
  const later = [
    { personId: "eleanor", name: "Eleanor Hart", role: "wife", age: 22, occupation: "keeping house" },
    { personId: "samuel", name: "Samuel Hart", role: "head", age: 23, occupation: "farmer" },
  ];
  const compared = compareHouseholds(earlier, later);
  assert.equal(compared.stay[0]?.name, "Eleanor Hart");
  assert.equal(compared.arrive[0]?.name, "Samuel Hart");
  assert.equal(compared.leave.length, 0);
  assert.equal(householdHeading("Cedar Falls", 1950, "North farm"), "Cedar Falls, 1950 · North farm");
  assert.equal(compareHeading("Cedar Falls", 1940, 1950), "Cedar Falls: 1940 and 1950");
  assert.equal(householdKey("Cedar Falls", "North farm"), "cedar falls / north farm");
  assert.match(memberLine(later[1]!), /Samuel Hart · head · age 23 · farmer/);
  assert.equal(censusOccupations(later)[0]?.occupation, "keeping house");
});

test("a church register extract keeps baptism, marriage, and burial lines in order", () => {
  assert.equal(normalizeRegisterKind("Christening"), "baptism");
  const lines = compileRegisterLines([
    { id: "3", kind: "burial", happenedOn: "2015-06-06", text: "buried at Fairview", personName: "Eleanor Hart" },
    { id: "1", kind: "baptism", happenedOn: "1928-04-12", text: "daughter of the house", personName: "Eleanor Whitaker" },
    { id: "2", kind: "marriage", happenedOn: "1948-06-14", text: "married at St. John's", personName: "Eleanor Hart", otherPersonName: "Samuel Hart" },
  ]);
  assert.equal(lines.map((line) => line.kind).join(","), "baptism,marriage,burial");
  assert.match(registerLineText(lines[1]!), /marriage: Eleanor Hart and Samuel Hart/);
  assert.match(registerHeading("St. John's", 3), /3 lines/);
});

test("a tax list names people for a place and year", () => {
  const names = compileTaxNames([
    { id: "2", name: "Samuel Hart", amount: "$42.00" },
    { id: "1", name: "Eleanor Hart" },
  ]);
  assert.equal(names[0]?.name, "Eleanor Hart");
  assert.equal(taxListHeading("Cedar Falls", 1950), "Cedar Falls, 1950");
  assert.equal(taxNameLine(names[1]!), "Samuel Hart · $42.00");
});

test("a passenger list keeps age, role, and notes", () => {
  const list = compilePassengerList([
    { personId: "wei", name: "Wei Chen", age: 21, role: "passenger", notes: "boarding card" },
    { personId: "meg", name: "Margaret Chen", role: "passenger" },
  ]);
  assert.equal(list[0]?.name, "Margaret Chen");
  assert.match(passengerLine(list[1]!), /Wei Chen · age 21 · passenger · boarding card/);
  assert.equal(voyagePassengerHeading("SS Eastern Star", 1), "SS Eastern Star · 1 passenger");
});

test("the tree poster names a family and joins partners", () => {
  assert.equal(posterHeading("Hart family"), "Hart family tree poster");
  assert.equal(posterGroupLine(["Eleanor Hart", "Samuel Hart"]), "Eleanor Hart & Samuel Hart");
});

test("saved searches keep a title and a reopen href", () => {
  assert.equal(savedSearchTitle("", "harvest dance"), "harvest dance");
  assert.equal(savedSearchHref("harvest dance"), "/search?q=harvest%20dance");
  assert.equal(savedSearchHeading(2), "2 saved searches");
});

test("a sticky note sits on the photograph", () => {
  assert.deepEqual(photoNoteStyle({ x: 42, y: 28 }), { left: "42%", top: "28%" });
  assert.equal(photoNoteHeading(1), "1 sticky note");
});

test("share links hide a living adult until they consent", () => {
  const adult = { id: "maya", displayName: "Maya Park", birthDate: new Date("1983-01-30"), deathDate: null };
  const child = { id: "nora", displayName: "Nora Park", birthDate: new Date("2018-06-14"), deathDate: null };
  const died = { id: "rose", displayName: "Rose Whitaker", birthDate: new Date("1929-03-08"), deathDate: new Date("2008-11-02") };
  assert.equal(isLivingAdult(adult, new Date("2026-09-22")), true);
  assert.equal(isLivingAdult(child, new Date("2026-09-22")), false);
  assert.equal(hideAdultWithoutConsent("share", adult, []), true);
  assert.equal(hideAdultWithoutConsent("share", adult, ["maya"]), false);
  assert.equal(hideAdultWithoutConsent(Role.contributor, adult, []), false);
  assert.equal(hidePhotoFromAudience("share", [adult], []), true);
  assert.equal(hidePhotoFromAudience("share", [adult], ["maya"]), false);
  assert.equal(hidePhotoFromAudience("share", [died], []), false);
  assert.equal(needsShareConsent(adult, []), true);
  assert.equal(livingAdultsNeedingConsent([adult], [{ personId: "maya", granted: true }]).length, 0);
  assert.equal(grantedConsentIds([{ personId: "maya", granted: true }])[0], "maya");
  assert.match(consentHeading(2), /2 living adults/);
});

test("reading a life concatenates chapters into one story", () => {
  const reading = compileLifeReading("Rose Whitaker", [
    {
      id: "childhood",
      kind: "childhood",
      title: "Childhood",
      items: [{ id: "p", kind: "photo", title: "Rose as a girl", href: "/p" }],
    },
    {
      id: "work",
      kind: "work",
      title: "The millinery years",
      notes: "The counter on Market Street.",
      items: [{ id: "l", kind: "letter", title: "June to Helen", body: "He bought a navy hatband.", href: "/l" }],
    },
    { id: "later", kind: "later", title: "Later years", items: [] },
  ]);
  assert.equal(reading.title, lifeReadingHeading("Rose Whitaker"));
  assert.equal(reading.paragraphs.length, 2);
  assert.match(reading.text, /The millinery years/);
  assert.match(reading.text, /navy hatband/);
  assert.doesNotMatch(reading.text, /Later years/);
});
