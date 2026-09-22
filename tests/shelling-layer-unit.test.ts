import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compileShelling,
  compileShellingGuests,
  missingShellingHeading,
  shellingBeeHeading,
  shellingBeesHeading,
  shellingGuestLine,
} from "../src/lib/shellingBee";
import { compileHorseTeams, horseTeamLine, horseTeamsHeading, missingTeamsHeading } from "../src/lib/horseTeam";
import { compileSmokehouse, missingSmokehouseHeading, smokehouseHeading, smokehouseLine } from "../src/lib/smokehouse";
import {
  assessmentsHeading,
  compileAssessments,
  compileInsuranceMembers,
  insuranceHeading,
  insuranceMemberLine,
  missingAssessmentsHeading,
} from "../src/lib/insurance";
import {
  cellarGuestLine,
  cellarHeading,
  cellarsHeading,
  compileCellarGuests,
  compileCellars,
  missingCellarsHeading,
} from "../src/lib/cycloneCellar";
import { cakeCutterLine, cakesHeading, compileCakes, missingCakesHeading } from "../src/lib/cakeCutter";
import { compileDistricts, districtYears, missingDistrictsHeading, roadDistrictLine, roadDistrictsHeading } from "../src/lib/roadDistrict";
import {
  butcheringsHeading,
  butcherJobLine,
  butcheringHeading,
  compileButchering,
  compileButcheringCrew,
  missingButcheringHeading,
} from "../src/lib/butchering";
import { christmasPartLine, compileRecitals, missingRecitalsHeading, recitalsHeading } from "../src/lib/christmasPart";
import { compilePeddlers, missingPeddlersHeading, peddlerLine, peddlersHeading } from "../src/lib/peddler";
import { compileStrays, missingStraysHeading, strayNoticeLine, straysHeading } from "../src/lib/strayNotice";
import { compileShows, medicineShowLine, missingShowsHeading, showsHeading } from "../src/lib/medicineShow";
import { butterMoldLine, compileMolds, missingMoldsHeading, moldsHeading } from "../src/lib/butterMold";
import { startSteps } from "../src/lib/startHere";
import { quietNavLinks } from "../src/lib/quietMode";

test("a corn-shelling bee lists who came, sorted by name, and whose crib", () => {
  assert.equal(shellingGuestLine("Robert Hart"), "Robert Hart");
  assert.equal(shellingBeeHeading("Samuel Hart", 2), "Samuel Hart’s crib · 2 people");
  assert.equal(shellingBeesHeading(1), "1 corn-shelling bee");
  assert.equal(missingShellingHeading(1), "1 corn-shelling bee still needs a roll");
  const guests = compileShellingGuests([
    { id: "w", person: "Wei Chen", personId: "w" },
    { id: "r", person: "Robert Hart", personId: "r" },
  ]);
  assert.deepEqual(guests.map((row) => row.person), ["Robert Hart", "Wei Chen"]);
  assert.equal(compileShelling([{ owner: "June", heldOn: "1951-01-01" }, { owner: "Samuel Hart", heldOn: "1950-11-12" }])[0]?.owner, "Samuel Hart");
});

test("who loaned the team keeps lender, borrower, and what it was for", () => {
  assert.equal(horseTeamLine("Samuel Hart", "Wei Chen", "harvest hauling", "1950-10-08"), "Samuel Hart loaned the team to Wei Chen for harvest hauling · 1950-10-08");
  assert.equal(horseTeamsHeading(1), "1 horse-team loan");
  assert.equal(missingTeamsHeading(1), "No horse-team loan has been written down");
  assert.equal(compileHorseTeams([{ id: "b", lender: "June", borrower: "Ned", purpose: "plowing", loanedOn: "1951-01-01" }, { id: "a", lender: "Samuel Hart", borrower: "Wei Chen", purpose: "harvest hauling", loanedOn: "1950-10-08" }])[0]?.purpose, "harvest hauling");
});

test("a smokehouse inventory keeps what was hanging and whose meat", () => {
  assert.equal(smokehouseLine("hams", "Eleanor Hart", "1951-11-20"), "hams · Eleanor Hart · 1951-11-20");
  assert.equal(smokehouseHeading(1), "1 smokehouse item");
  assert.equal(missingSmokehouseHeading(1), "No smokehouse inventory has been written down");
  assert.equal(compileSmokehouse([{ id: "b", person: "June", item: "bacon", hungOn: "1952-01-01" }, { id: "a", person: "Eleanor Hart", item: "hams", hungOn: "1951-11-20" }])[0]?.item, "hams");
});

test("a mutual-insurance assessment lists the company, the loss, and what each member paid", () => {
  assert.equal(insuranceMemberLine("Samuel Hart", "$4.50"), "Samuel Hart paid $4.50");
  assert.equal(insuranceHeading("Cedar Falls Farmers Mutual", "barn fire", 2), "Cedar Falls Farmers Mutual · barn fire · 2 members");
  assert.equal(assessmentsHeading(1), "1 mutual-insurance assessment");
  assert.equal(missingAssessmentsHeading(1), "1 assessment still needs a member roll");
  const members = compileInsuranceMembers([
    { id: "e", person: "Eleanor Hart", personId: "e", paid: "$4.50" },
    { id: "s", person: "Samuel Hart", personId: "s", paid: "$4.50" },
  ]);
  assert.deepEqual(members.map((row) => row.person), ["Eleanor Hart", "Samuel Hart"]);
  assert.equal(compileAssessments([{ company: "Later", assessedOn: "1953-01-01" }, { company: "Cedar Falls Farmers Mutual", assessedOn: "1952-03-04" }])[0]?.company, "Cedar Falls Farmers Mutual");
});

test("a cyclone-cellar list names who sheltered, sorted by name, and which storm", () => {
  assert.equal(cellarGuestLine("Eleanor Hart"), "Eleanor Hart");
  assert.equal(cellarHeading("1947 tornado", 3), "1947 tornado · 3 people");
  assert.equal(cellarsHeading(1), "1 cyclone-cellar list");
  assert.equal(missingCellarsHeading(1), "1 cyclone cellar still needs a roll");
  const guests = compileCellarGuests([
    { id: "s", person: "Samuel Hart", personId: "s" },
    { id: "e", person: "Eleanor Hart", personId: "e" },
  ]);
  assert.deepEqual(guests.map((row) => row.person), ["Eleanor Hart", "Samuel Hart"]);
  assert.equal(compileCellars([{ storm: "Later", heldOn: "1953-01-01" }, { storm: "1947 tornado", heldOn: "1947-06-21" }])[0]?.storm, "1947 tornado");
});

test("who cut the wedding cake keeps cutter, couple, and wedding", () => {
  assert.equal(cakeCutterLine("Eleanor Hart", "Margaret and Wei Chen", "Chen wedding", "1978-06-10"), "Eleanor Hart cut the cake for Margaret and Wei Chen · Chen wedding · 1978-06-10");
  assert.equal(cakesHeading(1), "1 wedding-cake cutter");
  assert.equal(missingCakesHeading(1), "No wedding-cake cutter has been written down");
  assert.equal(compileCakes([{ id: "b", cutter: "June", couple: "Later", wedding: "Town", cutOn: "1979-01-01" }, { id: "a", cutter: "Eleanor Hart", couple: "Margaret and Wei Chen", wedding: "Chen wedding", cutOn: "1978-06-10" }])[0]?.wedding, "Chen wedding");
});

test("a township road district keeps overseer, district, and term", () => {
  assert.equal(districtYears("1952-01-01", "1958-12-31"), "1952–1958");
  assert.equal(roadDistrictLine("Samuel Hart", "District 4", "1952–1958"), "Samuel Hart · District 4 · 1952–1958");
  assert.equal(roadDistrictsHeading(1), "1 township road district");
  assert.equal(missingDistrictsHeading(1), "No township road district has been written down");
  assert.equal(compileDistricts([{ id: "b", person: "June", district: "District 7", startedOn: "1960-01-01" }, { id: "a", person: "Samuel Hart", district: "District 4", startedOn: "1952-01-01" }])[0]?.district, "District 4");
});

test("a hog-butchering crew lists who came and each job, sorted by job then name", () => {
  assert.equal(butcherJobLine("Samuel Hart", "stick"), "Samuel Hart · stick");
  assert.equal(butcheringHeading("North-farm hog day", 3), "North-farm hog day · 3 people");
  assert.equal(butcheringsHeading(1), "1 hog-butchering crew");
  assert.equal(missingButcheringHeading(1), "1 hog-butchering crew still needs a roll");
  const workers = compileButcheringCrew([
    { id: "s", person: "Samuel Hart", personId: "s", job: "stick" },
    { id: "w", person: "Wei Chen", personId: "w", job: "scald" },
    { id: "r", person: "Robert Hart", personId: "r", job: "scrape" },
  ]);
  assert.deepEqual(workers.map((row) => row.job), ["scald", "scrape", "stick"]);
  assert.equal(compileButchering([{ title: "Later", heldOn: "1951-01-01" }, { title: "North-farm hog day", heldOn: "1950-12-02" }])[0]?.title, "North-farm hog day");
});

test("a Christmas-program part keeps who recited or sang and the piece", () => {
  assert.equal(christmasPartLine("Lily Chen", "recited", "Silent Night", "1992-12-20"), "Lily Chen recited Silent Night · 1992-12-20");
  assert.equal(recitalsHeading(1), "1 Christmas-program part");
  assert.equal(missingRecitalsHeading(1), "No Christmas-program part has been written down");
  assert.equal(compileRecitals([{ id: "b", person: "June", piece: "Away", kind: "sang", heldOn: "1993-12-20" }, { id: "a", person: "Lily Chen", piece: "Silent Night", kind: "recited", heldOn: "1992-12-20" }])[0]?.piece, "Silent Night");
});

test("a peddler visit keeps who stopped, what they sold, and to whom", () => {
  assert.equal(peddlerLine("Watkins", "vanilla", "Eleanor Hart", "1951-05-14"), "Watkins sold vanilla to Eleanor Hart · 1951-05-14");
  assert.equal(peddlersHeading(1), "1 peddler visit");
  assert.equal(missingPeddlersHeading(1), "No peddler visit has been written down");
  assert.equal(compilePeddlers([{ id: "b", peddler: "Later", goods: "pins", buyer: "June", visitedOn: "1952-01-01" }, { id: "a", peddler: "Watkins", goods: "vanilla", buyer: "Eleanor Hart", visitedOn: "1951-05-14" }])[0]?.peddler, "Watkins");
});

test("stray notices, medicine-show purchases, and butter-mold marks stay unused backups", () => {
  assert.equal(strayNoticeLine("Samuel Hart", "a sow", "1950-04-03"), "Samuel Hart posted a sow · 1950-04-03");
  assert.equal(straysHeading(1), "1 stray-animal notice");
  assert.equal(missingStraysHeading(1), "No stray-animal notice has been written down");
  assert.equal(compileStrays([{ id: "b", person: "June", animal: "a horse", postedOn: "1951-01-01" }, { id: "a", person: "Samuel Hart", animal: "a sow", postedOn: "1950-04-03" }])[0]?.animal, "a sow");
  assert.equal(medicineShowLine("Eleanor Hart", "a tonic", "Cedar Falls medicine show", "1953-08-16"), "Eleanor Hart bought a tonic at Cedar Falls medicine show · 1953-08-16");
  assert.equal(showsHeading(1), "1 medicine-show purchase");
  assert.equal(missingShowsHeading(1), "No medicine-show purchase has been written down");
  assert.equal(compileShows([{ id: "b", person: "June", item: "liniment", show: "Town", boughtOn: "1954-01-01" }, { id: "a", person: "Eleanor Hart", item: "a tonic", show: "Cedar Falls medicine show", boughtOn: "1953-08-16" }])[0]?.item, "a tonic");
  assert.equal(butterMoldLine("Eleanor Hart", "H"), "Eleanor Hart · H");
  assert.equal(moldsHeading(1), "1 butter-mold mark");
  assert.equal(missingMoldsHeading(1), "No butter-mold mark has been written down");
  assert.equal(compileMolds([{ id: "b", person: "June", mark: "J" }, { id: "a", person: "Eleanor Hart", mark: "H" }])[0]?.mark, "H");
});

test("quiet nav and start-here stay the same", () => {
  assert.equal(startSteps({ claimed: true, hasStory: true, hasPhoto: true }).length, 3);
  assert.deepEqual(
    quietNavLinks().map((link) => link.href),
    ["/", "/tree", "/ask", "/quiet"],
  );
});
