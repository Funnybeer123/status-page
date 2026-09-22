import assert from "node:assert/strict";
import { test } from "node:test";
import { countdownLine, compileFamilyHour, compilePastHour, daysUntil, emptyHourHeading, familyHourHeading, isUpcoming, missingInterviewHeading, pastHourHeading, utcDateKey } from "../src/lib/familyHour";
import { hasPostage, missingPostageHeading, postageHeading, postageLedgerHeading, postageLine } from "../src/lib/postage";
import { compilePhotoDuplicates, emptyPhotoDuplicatesHeading, normalizePhotoTitle, photoDuplicatesHeading, photoNearKey } from "../src/lib/photoDuplicates";
import { compileOralCredits, oralCreditsHeading, spokenByLine, uncreditedOralHeading } from "../src/lib/spokenBy";
import { compilePlaceCards, missingPlaceCardsHeading, placeCardHeading, placeCardsHeading } from "../src/lib/placeCards";
import { compilePostmarkMap, compilePostmarkTowns, missingPostmarkMapHeading, postmarkMapHeading, postmarkTownsHeading } from "../src/lib/postmarkMap";
import { defaultFamilyRules, familyRulesHeading, missingRulesHeading, rulesDenied } from "../src/lib/familyRules";
import { incompleteStartHeading, ringLabel, startRingDash, startRingHeading, startRingPercent } from "../src/lib/startRing";
import { compileSameDay, emptySameDayHeading, familySameDayHeading, missingSameDayHeading, sameDayHeading } from "../src/lib/sameDay";
import { decadeZipEmptyMessage, decadeZipHeading, decadeZipName, decadeZipsReadyHeading, missingDecadeZipHeading } from "../src/lib/decadeZip";
import { startSteps } from "../src/lib/startHere";
import { quietNavLinks } from "../src/lib/quietMode";

test("family hour counts days in UTC until the next reunion or interview", () => {
  assert.equal(utcDateKey("2026-10-18"), "2026-10-18");
  assert.equal(isUpcoming("2026-10-18", new Date("2026-09-22T12:00:00Z")), true);
  assert.equal(isUpcoming("2026-07-04", new Date("2026-09-22T12:00:00Z")), false);
  assert.equal(daysUntil("2026-09-22", new Date("2026-09-22T18:00:00Z")), 0);
  assert.equal(daysUntil("2026-09-23", new Date("2026-09-22T18:00:00Z")), 1);
  assert.equal(countdownLine("Harvest supper", "2026-10-18", new Date("2026-09-22T12:00:00Z")), "Harvest supper · 26 days");
  assert.equal(countdownLine("Today’s interview", "2026-09-22", new Date("2026-09-22T12:00:00Z")), "Today’s interview · today");
  assert.equal(countdownLine("Yesterday", "2026-09-21", new Date("2026-09-22T12:00:00Z")), "Yesterday · already happened");
  assert.match(familyHourHeading("Harvest supper", "2026-10-18"), /Family hour · Harvest supper/);
  assert.equal(emptyHourHeading(), "Nothing on the family hour yet");
  assert.equal(pastHourHeading(1), "1 past reunion or interview");
  assert.equal(missingInterviewHeading(2), "2 interviews still need a date");
  const hour = compileFamilyHour(
    [
      { id: "july", kind: "reunion", title: "July picnic", happenedOn: "2026-07-04", href: "/reunions/july" },
      { id: "sup", kind: "reunion", title: "Harvest supper", happenedOn: "2026-10-18", href: "/reunions/sup" },
      { id: "lily", kind: "interview", title: "Interview · Lily Chen", happenedOn: "2026-10-19", href: "/interviews" },
    ],
    new Date("2026-09-22T12:00:00Z"),
  );
  assert.equal(hour.next?.title, "Harvest supper");
  assert.equal(hour.upcoming.length, 2);
  const past = compilePastHour(
    [
      { id: "july", kind: "reunion", title: "July picnic", happenedOn: "2026-07-04", href: "/reunions/july" },
      { id: "sup", kind: "reunion", title: "Harvest supper", happenedOn: "2026-10-18", href: "/reunions/sup" },
    ],
    new Date("2026-09-22T12:00:00Z"),
  );
  assert.equal(past[0]?.title, "July picnic");
});

test("postage names what the stamp cost", () => {
  assert.equal(postageLine("3 cents"), "Postage · 3 cents");
  assert.equal(postageLine(""), "Postage unknown");
  assert.equal(hasPostage({ postage: "3 cents" }), true);
  assert.equal(postageHeading(1), "1 letter with a postage cost");
  assert.equal(missingPostageHeading(1), "1 letter still needs a postage cost");
  assert.equal(postageLedgerHeading(2), "Postage ledger · 2 letters");
});

test("duplicate photographs group identical files first, then the same day and title", () => {
  assert.equal(normalizePhotoTitle("Hart picnic, 1961 (copy)"), "hart picnic 1961");
  assert.equal(photoNearKey("Hart picnic, 1961 (copy)", "1961-07-04T16:00:00Z", "image/svg+xml"), "hart picnic 1961|1961-07-04|image/svg+xml");
  assert.equal(photoDuplicatesHeading(1), "1 group of near-identical photographs");
  assert.equal(emptyPhotoDuplicatesHeading(), "Every photograph looks unique");
  const groups = compilePhotoDuplicates([
    { id: "a", title: "Hart picnic, 1961", capturedAt: "1961-07-04T16:00:00Z", mimeType: "image/svg+xml", crc: "abc" },
    { id: "b", title: "Hart picnic, 1961 (copy)", capturedAt: "1961-07-04T16:00:00Z", mimeType: "image/svg+xml", crc: "abc" },
    { id: "c", title: "Harvest program", capturedAt: "1947-10-18T20:00:00Z", mimeType: "image/svg+xml", crc: "one" },
    { id: "d", title: "Harvest program (copy)", capturedAt: "1947-10-18T20:00:00Z", mimeType: "image/svg+xml", crc: "two" },
  ]);
  assert.equal(groups[0]?.reason, "identical");
  assert.equal(groups[0]?.items.length, 2);
  assert.equal(groups[1]?.reason, "near");
  assert.equal(groups[1]?.items.map((item) => item.id).sort().join(","), "c,d");
});

test("spoken by stays separate from who uploaded the recording", () => {
  assert.equal(spokenByLine("Eleanor Hart", "Lily Chen"), "Spoken by Eleanor Hart · uploaded by Lily Chen");
  assert.equal(spokenByLine("Eleanor Hart", "Eleanor Hart"), "Spoken by Eleanor Hart");
  assert.equal(spokenByLine(null, "Lily Chen"), "Speaker unknown");
  assert.equal(uncreditedOralHeading(1), "1 oral history still needs a spoken-by credit");
  assert.equal(oralCreditsHeading(1), "1 oral history names who spoke");
  const credits = compileOralCredits([
    { id: "oral", title: "Eleanor, said out loud", spokenBy: { displayName: "Eleanor Hart" }, uploadedBy: { name: "Lily Chen" } },
  ]);
  assert.match(credits[0]?.line || "", /Spoken by Eleanor Hart/);
});

test("place cards print one card for each seated guest", () => {
  assert.equal(placeCardHeading("Lily Chen", "Hart reunion"), "Place card · Lily Chen · Hart reunion");
  assert.equal(placeCardsHeading("Hart reunion", 2), "Place cards · Hart reunion · 2 seats");
  assert.equal(missingPlaceCardsHeading(1), "1 reunion still needs place cards");
  const cards = compilePlaceCards("Hart reunion", [
    { id: "2", tableName: "Cottonwood", seat: 2, person: { id: "meg", displayName: "Margaret Chen" } },
    { id: "1", tableName: "Cottonwood", seat: 1, person: { id: "lily", displayName: "Lily Chen" } },
  ]);
  assert.equal(cards[0]?.name, "Lily Chen");
  assert.match(cards[0]?.line || "", /seat 1/);
});

test("the postmark map places letters by stamp text", () => {
  assert.equal(postmarkMapHeading(1), "1 letter mailed from a known place");
  assert.equal(missingPostmarkMapHeading(1), "1 postmark still needs a place");
  assert.equal(postmarkTownsHeading(1), "1 town letters were mailed from");
  const compiled = compilePostmarkMap([
    { id: "harvest", title: "Harvest letter", stampText: "Cedar Falls, Iowa", postmarkedAt: "1947-10-19" },
    { id: "unknown", title: "Prairie note", stampText: "Unknown prairie", postmarkedAt: "1947-10-20" },
  ]);
  assert.equal(compiled.placed.length, 1);
  assert.equal(compiled.placed[0]?.title, "Harvest letter");
  assert.ok(compiled.placed[0]?.latitude);
  assert.equal(compiled.missing[0]?.title, "Prairie note");
  const towns = compilePostmarkTowns(compiled.placed);
  assert.equal(towns[0]?.town, "Cedar Falls, Iowa");
});

test("family rules default to living privacy and keep-out of Ask", () => {
  assert.match(defaultFamilyRules(), /living relative/);
  assert.match(defaultFamilyRules(), /keep-out of Ask/);
  assert.equal(familyRulesHeading(false), "Family rules · still the usual ones");
  assert.equal(familyRulesHeading(true), "Family rules");
  assert.equal(missingRulesHeading(), "The family has not written its own rules yet");
  assert.equal(rulesDenied(), "Only owners can edit the family rules");
});

test("the start-here ring uses only the three first steps", () => {
  const steps = startSteps({ claimed: true, hasStory: true, hasPhoto: false });
  assert.equal(steps.length, 3);
  assert.equal(startRingPercent(steps), 67);
  assert.equal(startRingHeading(67), "Start-here progress · 67%");
  assert.equal(incompleteStartHeading(1), "1 start-here step still open");
  assert.match(ringLabel(steps), /Upload one photograph still to do/);
  const dash = startRingDash(50, 42);
  assert.ok(dash.filled < dash.circumference);
});

test("same day in history matches month and day in UTC", () => {
  const items = compileSameDay(
    [
      { id: "hem", title: "Eleanor hems the harvest dress", happenedOn: "1947-09-22", href: "/people/eleanor" },
      { id: "dance", title: "Harvest dance", happenedOn: "1947-10-18", href: "/people/eleanor" },
    ],
    new Date("2026-09-22T12:00:00Z"),
  );
  assert.equal(items.length, 1);
  assert.equal(items[0]?.year, "1947");
  assert.match(sameDayHeading("Eleanor Hart", new Date("2026-09-22T12:00:00Z")), /Same day in history · Eleanor Hart/);
  assert.equal(emptySameDayHeading("Cousin Ned"), "Nothing on this day in Cousin Ned's archive");
  assert.equal(missingSameDayHeading(1), "1 person has nothing on this day");
  assert.match(familySameDayHeading(1, new Date("2026-09-22T12:00:00Z")), /1 person has something/);
});

test("a decade folder zip is named after the ten-year span", () => {
  assert.equal(decadeZipName(1940), "1940s-folder.zip");
  assert.equal(decadeZipHeading(1940), "Download the 1940s folder");
  assert.equal(decadeZipEmptyMessage(), "This decade folder has no photographs to export.");
  assert.equal(missingDecadeZipHeading(1), "1 decade folder still needs a photograph");
  assert.equal(decadeZipsReadyHeading(1), "1 decade folder is ready to download");
});

test("quiet nav stays the same four links", () => {
  assert.deepEqual(
    quietNavLinks().map((link) => link.href),
    ["/", "/tree", "/ask", "/quiet"],
  );
});
