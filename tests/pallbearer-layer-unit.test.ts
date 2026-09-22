import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compilePallbearers,
  funeralPallbearersHeading,
  missingPallbearersHeading,
  pallbearerLine,
  pallbearerSortKey,
  pallbearersHeading,
} from "../src/lib/pallbearers";
import {
  compileGownChain,
  gownHeading,
  gownWearLine,
  gownsHeading,
  missingGownsHeading,
} from "../src/lib/christeningGown";
import { compileIceHarvest, iceHarvestHeading, iceHarvestLine, missingIceHeading } from "../src/lib/iceHarvest";
import { camerasHeading, compileCameras, missingCamerasHeading, photographerLine } from "../src/lib/photographer";
import { compileSpellings, missingSpellingsHeading, spellingLine, spellingsHeading } from "../src/lib/surnameSpellings";
import { compileThreshing, missingThreshingHeading, threshingHeading, threshingLine } from "../src/lib/threshing";
import { compileLastSeen, compileMissingLastSeen, lastSeenHeading, lastSeenLine, missingLastSeenHeading } from "../src/lib/lastSeen";
import { compileTeachers, missingTeachersHeading, teacherLine, teachersHeading } from "../src/lib/schoolteacher";
import { compileVehicles, missingVehiclesHeading, vehicleLine, vehicleYears, vehiclesHeading } from "../src/lib/vehicles";
import { compilePartyLines, missingPartyLinesHeading, partyLineLine, partyLineNumber, partyLinesHeading } from "../src/lib/partyLine";
import { compileMilkStops, milkRouteHeading, milkRoutesHeading, milkStopLine, missingMilkHeading } from "../src/lib/milkRoute";
import { compilePews, missingPewsHeading, pewLine, pewsHeading } from "../src/lib/churchPew";
import { blanketLine, blanketsHeading, compileBlankets, missingBlanketsHeading } from "../src/lib/graveBlanket";
import { compileElevators, elevatorLine, elevatorsHeading, missingElevatorsHeading } from "../src/lib/grainElevator";
import { startSteps } from "../src/lib/startHere";
import { quietNavLinks } from "../src/lib/quietMode";

test("pallbearers sort by role, then name", () => {
  assert.equal(pallbearerSortKey("head"), "01");
  assert.equal(pallbearerLine("Robert Hart", "head", "Eleanor Hart"), "Robert Hart · head · Eleanor Hart");
  assert.equal(pallbearersHeading(3), "3 pallbearers");
  assert.equal(funeralPallbearersHeading("Eleanor Hart", 3), "Pallbearers · Eleanor Hart · 3 people");
  assert.equal(missingPallbearersHeading(1), "1 funeral still needs a pallbearer");
  const rows = compilePallbearers([
    { id: "j", deceased: "Eleanor Hart", bearer: "James Chen", role: "right", deceasedId: "e", personId: "j" },
    { id: "r", deceased: "Eleanor Hart", bearer: "Robert Hart", role: "head", deceasedId: "e", personId: "r" },
    { id: "w", deceased: "Eleanor Hart", bearer: "Wei Chen", role: "left", deceasedId: "e", personId: "w" },
  ]);
  assert.deepEqual(rows.map((row) => row.role), ["head", "left", "right"]);
});

test("a christening gown chain sorts by the day it was worn", () => {
  assert.equal(gownWearLine("Lily Chen", "1984-07-21"), "Lily Chen · 1984-07-21");
  assert.equal(gownHeading("Hart christening gown", 3), "Hart christening gown · 3 wearers");
  assert.equal(gownsHeading(1), "1 christening gown");
  assert.equal(missingGownsHeading(1), "1 gown still needs a wearer");
  const chain = compileGownChain([
    { id: "l", person: "Lily Chen", personId: "l", wornOn: "1984-07-21" },
    { id: "e", person: "Eleanor Hart", personId: "e", wornOn: "1928-03-12" },
    { id: "m", person: "Margaret Chen", personId: "m", wornOn: "1952-04-02" },
  ]);
  assert.deepEqual(chain.map((row) => row.person), ["Eleanor Hart", "Margaret Chen", "Lily Chen"]);
});

test("ice-harvest and threshing rings keep the year and the role", () => {
  assert.equal(iceHarvestLine("Samuel Hart", 1947, "pike"), "Samuel Hart · pike · 1947");
  assert.equal(iceHarvestHeading(1), "1 ice-harvest crew record");
  assert.equal(missingIceHeading(1), "The ice-harvest crew list is still empty");
  assert.equal(compileIceHarvest([{ id: "b", person: "Wei Chen", year: 1948 }, { id: "a", person: "Samuel Hart", year: 1947 }])[0]?.person, "Samuel Hart");
  assert.equal(threshingLine("Samuel Hart", 1948, "bundle pitcher"), "Samuel Hart · bundle pitcher · 1948");
  assert.equal(threshingHeading(1), "1 threshing-ring record");
  assert.equal(missingThreshingHeading(1), "The threshing ring is still empty");
  assert.equal(compileThreshing([{ id: "b", person: "Wei", year: 1949 }, { id: "a", person: "Samuel Hart", year: 1948 }])[0]?.year, 1948);
});

test("who held the camera stays separate from who sat", () => {
  assert.equal(photographerLine("Hart picnic, 1961", "Margaret Chen"), "Margaret Chen held the camera for Hart picnic, 1961");
  assert.equal(camerasHeading(1), "1 photograph with who held the camera");
  assert.equal(missingCamerasHeading(1), "1 photograph still needs who held the camera");
  assert.equal(compileCameras([{ id: "p", title: "Picnic", photographer: "Margaret Chen" }])[0]?.photographer, "Margaret Chen");
});

test("surname variants stay with the record they came from", () => {
  assert.equal(spellingLine("Whitaker", "Whiticker", "1930 census"), "Whitaker also written Whiticker · 1930 census");
  assert.equal(spellingsHeading(2), "2 surname spelling variants");
  assert.equal(missingSpellingsHeading(1), "No surname variants have been recorded");
  assert.equal(compileSpellings([{ id: "b", surname: "Whitaker", variant: "Whittaker" }, { id: "a", surname: "Whitaker", variant: "Whiticker" }])[0]?.variant, "Whiticker");
});

test("last-seen dates sort by the day, and missing dates stay missing", () => {
  assert.equal(lastSeenLine("Eleanor Hart", "2015-05-20"), "Last time we saw Eleanor Hart · 2015-05-20");
  assert.equal(lastSeenHeading(2), "2 last-seen dates");
  assert.equal(missingLastSeenHeading(1), "1 person still needs a last-seen date");
  const rows = compileLastSeen([
    { id: "m", displayName: "Margaret Chen", lastSeenOn: "2026-09-01" },
    { id: "e", displayName: "Eleanor Hart", lastSeenOn: "2015-05-20" },
    { id: "s", displayName: "Samuel Hart" },
  ]);
  assert.equal(rows[0]?.displayName, "Eleanor Hart");
  assert.equal(compileMissingLastSeen([{ id: "s", displayName: "Samuel Hart" }, { id: "e", displayName: "Eleanor Hart", lastSeenOn: "2015-05-20" }])[0]?.displayName, "Samuel Hart");
});

test("a schoolteacher is named for one class year", () => {
  assert.equal(teacherLine("Margaret Chen", "Cedar Falls High", 1984), "Margaret Chen taught Cedar Falls High · 1984");
  assert.equal(teachersHeading(1), "1 schoolteacher");
  assert.equal(missingTeachersHeading(1), "1 class still needs a teacher");
  assert.equal(compileTeachers([{ id: "c", teacher: "Margaret Chen", school: "Cedar Falls High", year: 1984 }])[0]?.year, 1984);
});

test("vehicle years use the ISO year span", () => {
  assert.equal(vehicleYears("1952-01-01", "1978-12-31"), "1952–1978");
  assert.equal(vehicleLine("North-farm truck", "truck", "1952–1978"), "North-farm truck · truck · 1952–1978");
  assert.equal(vehiclesHeading(1), "1 family vehicle");
  assert.equal(missingVehiclesHeading(1), "The vehicle log is still empty");
  assert.equal(compileVehicles([{ id: "t", name: "North-farm truck", kind: "truck", startedOn: "1952-01-01", endedOn: "1978-12-31" }])[0]?.years, "1952–1978");
});

test("a party line is the exchange and number, not the phone tree", () => {
  assert.equal(partyLineNumber("Cedar Falls", "4-218"), "Cedar Falls 4-218");
  assert.equal(partyLineLine("Cedar Falls", "4-218", ["Eleanor Hart", "Samuel Hart"]), "Cedar Falls 4-218 · Eleanor Hart, Samuel Hart");
  assert.equal(partyLinesHeading(1), "1 party line");
  assert.equal(missingPartyLinesHeading(1), "No party line has been written down");
  assert.equal(compilePartyLines([{ id: "a", exchange: "Cedar Falls", number: "4-218", people: ["Eleanor Hart"] }])[0]?.number, "4-218");
});

test("milk stops keep porch order", () => {
  assert.equal(milkStopLine("Samuel Hart", 1), "Stop 1 · Samuel Hart");
  assert.equal(milkRouteHeading("Cedar Falls dairy", 1), "Cedar Falls dairy · 1 stop");
  assert.equal(milkRoutesHeading(1), "1 milk route");
  assert.equal(missingMilkHeading(1), "The milk route is still empty");
  const stops = compileMilkStops([
    { id: "b", person: "Margaret Chen", stopOrder: 2 },
    { id: "a", person: "Samuel Hart", stopOrder: 1 },
  ]);
  assert.equal(stops[0]?.person, "Samuel Hart");
});

test("a rented pew and a grave blanket keep the church and the day", () => {
  assert.equal(pewLine("St. John's", "12", "Eleanor Hart"), "St. John's · pew 12 · Eleanor Hart");
  assert.equal(pewsHeading(1), "1 rented church pew");
  assert.equal(missingPewsHeading(1), "No rented pew has been recorded");
  assert.equal(compilePews([{ church: "St. John's", pewNumber: "12" }])[0]?.pewNumber, "12");
  assert.equal(blanketLine("Eleanor Hart", "December 24", "Margaret Chen"), "Eleanor Hart · December 24 · placed by Margaret Chen");
  assert.equal(blanketsHeading(1), "1 grave-blanket date");
  assert.equal(missingBlanketsHeading(1), "The grave-blanket schedule is still empty");
  assert.equal(compileBlankets([{ monthDay: "December 24", person: "Eleanor Hart" }])[0]?.monthDay, "December 24");
});

test("a grain-elevator account names the house, the book, and the year", () => {
  assert.equal(elevatorLine("Samuel Hart", "Cedar Falls Co-op", "Hart 14", 1952), "Samuel Hart · Cedar Falls Co-op · Hart 14 · 1952");
  assert.equal(elevatorsHeading(1), "1 grain-elevator account");
  assert.equal(missingElevatorsHeading(1), "No grain-elevator account has been written down");
  assert.equal(compileElevators([{ id: "a", person: "Samuel Hart", elevator: "Cedar Falls Co-op", account: "Hart 14", year: 1952 }])[0]?.account, "Hart 14");
});

test("quiet nav and start-here stay the same", () => {
  assert.equal(startSteps({ claimed: true, hasStory: true, hasPhoto: true }).length, 3);
  assert.deepEqual(
    quietNavLinks().map((link) => link.href),
    ["/", "/tree", "/ask", "/quiet"],
  );
});
