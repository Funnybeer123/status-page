import assert from "node:assert/strict";
import { test } from "node:test";
import { funeralDates, funeralHeading, funeralLife, funeralsHeading, missingFuneralPortraitHeading } from "../src/lib/funeral";
import { letterPairHeading, letterPairSideLabel, peopleWithTwoLetters, peopleWithTwoLettersHeading, sortLettersForPair } from "../src/lib/letterPair";
import { atlasChronicleHref, atlasHeading, atlasNeedsSummary, atlasSummary, emptyAtlasHeading } from "../src/lib/atlas";
import { huntBadgeLine, huntBadgesHeading, huntFinishersHeading, unfinishedHuntsHeading } from "../src/lib/huntBadge";
import { groupSeats, missingSeatingHeading, seatLine, seatingHeading } from "../src/lib/seating";
import { sinceVisitHeading, sinceVisitLine } from "../src/lib/sinceVisit";
import { groupByUploader, uploaderGroupHeading, uploadersHeading } from "../src/lib/archiveUploaders";
import { compileLifeDraftFill, emptyLifeDraftsHeading, isEmptyDraft, lifeDraftAskQuestion, lifeDraftHeading, mergeDraftBody } from "../src/lib/lifeDraft";
import { gpsLabel, hasGpsField, missingGpsHeading, parseGps, placeGpsHeading, placeMapPoint } from "../src/lib/placeGps";
import { dictionaryHeading, nicknameUseLine, unusedNicknamesHeading } from "../src/lib/nicknameDictionary";

test("a funeral program names the dates, the portrait, and a short life", () => {
  assert.equal(funeralHeading("Eleanor Hart"), "In memory of Eleanor Hart");
  assert.match(funeralDates("1928-03-12", "2015-06-03"), /1928 – 2015/);
  assert.match(funeralDates("1928-03-12", "2015-06-03"), /Born 12 March 1928/);
  assert.match(funeralLife("Called Ellie.", "I danced three times with Samuel Hart."), /Called Ellie/);
  assert.equal(funeralLife(null, null), "A short life still waiting to be written.");
  assert.equal(funeralsHeading(2), "2 funeral programs");
  assert.equal(missingFuneralPortraitHeading(1), "1 funeral program still needs a portrait");
});

test("two letters by the same person sit side by side", () => {
  const sorted = sortLettersForPair([
    { title: "Later letter", writtenAt: "1948-06-14" },
    { title: "Harvest letter", writtenAt: "1947-10-18" },
  ]);
  const fromDates = sortLettersForPair([
    { title: "Later letter", writtenAt: new Date("1948-06-14T00:00:00Z") },
    { title: "Harvest letter", writtenAt: new Date("1947-10-18T00:00:00Z") },
  ]);
  assert.equal(sorted[0]?.title, "Harvest letter");
  assert.equal(fromDates[0]?.title, "Harvest letter");
  assert.equal(letterPairHeading("Eleanor Hart"), "Two letters by Eleanor Hart");
  assert.match(letterPairSideLabel("Harvest letter", "18 October 1947"), /Harvest letter/);
  const people = peopleWithTwoLetters([
    { people: [{ personId: "eleanor", displayName: "Eleanor Hart" }] },
    { people: [{ personId: "eleanor", displayName: "Eleanor Hart" }, { personId: "samuel", displayName: "Samuel Hart" }] },
  ]);
  assert.equal(people[0]?.displayName, "Eleanor Hart");
  assert.equal(peopleWithTwoLettersHeading(1), "1 person has two letters side by side");
});

test("the family atlas summarizes each place and links into the chronicle", () => {
  assert.equal(atlasHeading(2), "2 places in the family atlas");
  assert.match(atlasSummary({ residents: 2, events: 1, photos: 1 }), /2 people lived here/);
  assert.equal(atlasSummary({}), "Open the chronicle to begin this place.");
  assert.equal(atlasChronicleHref("place-1"), "/places/place-1");
  assert.equal(atlasNeedsSummary({ residents: 0, events: 0, photos: 0 }), true);
  assert.equal(emptyAtlasHeading(1), "1 atlas place still needs a summary");
});

test("a scavenger-hunt badge names who finished", () => {
  assert.equal(huntBadgeLine("Lily Chen", "Harvest scavenger hunt"), "Lily Chen finished Harvest scavenger hunt");
  assert.equal(huntBadgesHeading(1), "1 scavenger hunt badge");
  assert.equal(unfinishedHuntsHeading(1), "1 hunt still needs a finisher");
  assert.equal(huntFinishersHeading(2), "2 relatives finished this hunt");
});

test("a reunion seating chart groups guests by table", () => {
  assert.match(seatingHeading("Hart reunion", 2), /2 seats/);
  assert.equal(seatLine("Lily Chen", "Cottonwood table", 1), "Lily Chen · Cottonwood table, seat 1");
  const tables = groupSeats([
    { tableName: "Cottonwood table" },
    { tableName: "North farm table" },
    { tableName: "Cottonwood table" },
  ]);
  assert.equal(tables[0]?.seats.length, 2);
  assert.equal(missingSeatingHeading(0), "Every reunion has a seating chart");
});

test("what changed since last visit keeps first-visit wording", () => {
  assert.equal(sinceVisitHeading(0, true), "Welcome back — nothing new yet");
  assert.equal(sinceVisitHeading(2, false), "2 things changed since your last visit");
  assert.equal(sinceVisitLine("Cottonwoods this summer", "Maya Park"), "Maya Park · Cottonwoods this summer");
});

test("the archive can be grouped by who uploaded", () => {
  const groups = groupByUploader([
    { title: "Picnic", uploadedBy: { name: "Maya Park" } },
    { title: "Wedding", uploadedByName: "Aunt June" },
    { title: "Letter scan", uploadedBy: { name: "Maya Park" } },
  ]);
  assert.equal(groups[0]?.name, "Aunt June");
  assert.equal(groups[1]?.heading, "Maya Park · 2 uploads");
  assert.equal(uploadersHeading(2), "2 relatives have uploaded to the archive");
  assert.equal(uploaderGroupHeading("Maya Park", 1), "Maya Park · 1 upload");
});

test("Ask can fill a life-story draft from letters and stories", () => {
  assert.equal(lifeDraftAskQuestion("Eleanor Hart"), "What do the letters and stories say about Eleanor Hart?");
  assert.equal(mergeDraftBody("First.", "First."), "First.");
  assert.match(mergeDraftBody("First.", "Second."), /Second/);
  const filled = compileLifeDraftFill({
    name: "Eleanor Hart",
    letters: [{ title: "Harvest letter", excerpt: "I danced three times." }],
    stories: [{ title: "Cottonwoods", excerpt: "The walk home." }],
  });
  assert.match(filled.title, /Draft life story for Eleanor Hart/);
  assert.match(filled.body, /From Harvest letter/);
  assert.equal(isEmptyDraft("  "), true);
  assert.equal(emptyLifeDraftsHeading(1), "1 life draft is still empty");
  assert.equal(lifeDraftHeading("Eleanor Hart"), "Draft life story for Eleanor Hart");
});

test("a GPS field parses onto the map", () => {
  const parsed = parseGps("42.5278 N, 92.4453 W");
  assert.ok(parsed);
  assert.equal(parsed.latitude, 42.5278);
  assert.equal(parsed.longitude, -92.4453);
  assert.match(gpsLabel(42.5278, -92.4453), /42.5278° N/);
  assert.equal(placeGpsHeading("Cedar Falls"), "GPS for Cedar Falls");
  assert.equal(hasGpsField({ gps: "42.5278 N, 92.4453 W" }), true);
  assert.equal(missingGpsHeading(1), "1 place still needs a GPS field");
  assert.equal(placeMapPoint({ latitude: 42.5, longitude: -92.4 })?.latitude, 42.5);
});

test("the family dictionary says how a nickname is used", () => {
  assert.equal(dictionaryHeading(2), "2 nicknames in the family dictionary");
  assert.match(nicknameUseLine("Ellie", "Eleanor Hart", "What Sam called her"), /used for Eleanor Hart/);
  assert.equal(unusedNicknamesHeading(1), "1 nickname still needs how it is used");
});
