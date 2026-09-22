import assert from "node:assert/strict";
import { test } from "node:test";
import { compileFences, fenceViewerLine, fenceViewersHeading, missingFencesHeading } from "../src/lib/fenceViewer";
import { compileRoadTaxes, missingRoadTaxesHeading, roadTaxLine, roadTaxesHeading } from "../src/lib/roadTax";
import { compileCreamery, creameryHeading, creameryLine, missingCreameryHeading } from "../src/lib/creameryCheck";
import { compileRods, lightningRodLine, lightningRodsHeading, missingRodsHeading } from "../src/lib/lightningRod";
import { compileMaple, mapleCampLine, mapleCampsHeading, missingMapleHeading } from "../src/lib/mapleCamp";
import {
  compileHusking,
  compileHuskingGuests,
  huskingBeeHeading,
  huskingBeesHeading,
  huskingGuestLine,
  missingHuskingHeading,
} from "../src/lib/huskingBee";
import { compileMidwives, midwifeLine, midwivesHeading, missingMidwivesHeading } from "../src/lib/midwife";
import { carverLine, carversHeading, compileCarvers, missingCarversHeading } from "../src/lib/headstoneCarver";
import {
  charivariGuestLine,
  charivariHeading,
  charivarisHeading,
  compileCharivariGuests,
  compileCharivaris,
  missingCharivariHeading,
} from "../src/lib/charivari";
import { brandYears, cattleBrandLine, cattleBrandsHeading, compileBrands, missingBrandsHeading } from "../src/lib/cattleBrand";
import { compileSorghum, missingSorghumHeading, sorghumHeading, sorghumLine } from "../src/lib/sorghumBoil";
import { compileSickWatches, missingSickHeading, sickWatchLine, sickWatchesHeading } from "../src/lib/sickWatch";
import { boardYears, compileBoards, missingBoardsHeading, schoolBoardLine, schoolBoardsHeading } from "../src/lib/schoolBoard";
import { startSteps } from "../src/lib/startHere";
import { quietNavLinks } from "../src/lib/quietMode";

test("a fence-viewer appointment keeps who walked and which neighbors", () => {
  assert.equal(fenceViewerLine("Samuel Hart", "Whitaker and Chen", "1949-04-12"), "Samuel Hart walked the line for Whitaker and Chen · 1949-04-12");
  assert.equal(fenceViewersHeading(1), "1 fence-viewer appointment");
  assert.equal(missingFencesHeading(1), "No fence-viewer appointment has been written down");
  assert.equal(compileFences([{ id: "b", person: "June", neighbors: "A", walkedOn: "1950-01-01" }, { id: "a", person: "Samuel Hart", neighbors: "Whitaker and Chen", walkedOn: "1949-04-12" }])[0]?.person, "Samuel Hart");
});

test("road tax keeps who worked, which road, and how many days", () => {
  assert.equal(roadTaxLine("Samuel Hart", "north township road", 3, 1952), "Samuel Hart worked 3 days on north township road · 1952");
  assert.equal(roadTaxesHeading(1), "1 road-tax record");
  assert.equal(missingRoadTaxesHeading(1), "No road-tax days have been written down");
  assert.equal(compileRoadTaxes([{ id: "b", person: "June", road: "south", days: 1, year: 1953 }, { id: "a", person: "Samuel Hart", road: "north township road", days: 3, year: 1952 }])[0]?.year, 1952);
});

test("a creamery check keeps date, pounds, and amount", () => {
  assert.equal(creameryLine("Eleanor Hart", "40 pounds", "$8.20", "1961-06-15"), "Eleanor Hart · 40 pounds · $8.20 · 1961-06-15");
  assert.equal(creameryHeading(1), "1 creamery check");
  assert.equal(missingCreameryHeading(1), "No creamery check has been written down");
  assert.equal(compileCreamery([{ id: "b", person: "June", pounds: "10", amount: "$2", paidOn: "1962-01-01" }, { id: "a", person: "Eleanor Hart", pounds: "40 pounds", amount: "$8.20", paidOn: "1961-06-15" }])[0]?.person, "Eleanor Hart");
});

test("a lightning-rod installer names the building", () => {
  assert.equal(lightningRodLine("Samuel Hart", "north-farm barn", 1949), "Samuel Hart put rods on north-farm barn · 1949");
  assert.equal(lightningRodsHeading(1), "1 lightning-rod installer");
  assert.equal(missingRodsHeading(1), "No lightning-rod installer has been written down");
  assert.equal(compileRods([{ id: "b", person: "June", building: "town house", year: 1960 }, { id: "a", person: "Samuel Hart", building: "north-farm barn", year: 1949 }])[0]?.building, "north-farm barn");
});

test("a maple-sugar camp keeps who boiled and how many gallons", () => {
  assert.equal(mapleCampLine("Samuel Hart", "12 gallons", "north-farm grove", 1951), "Samuel Hart boiled 12 gallons · north-farm grove · 1951");
  assert.equal(mapleCampsHeading(1), "1 maple-sugar camp");
  assert.equal(missingMapleHeading(1), "No maple-sugar camp has been written down");
  assert.equal(compileMaple([{ id: "b", person: "June", gallons: "2", year: 1952 }, { id: "a", person: "Samuel Hart", gallons: "12 gallons", year: 1951 }])[0]?.year, 1951);
});

test("a husking bee lists who came, sorted by name, and whose field", () => {
  assert.equal(huskingGuestLine("Robert Hart"), "Robert Hart");
  assert.equal(huskingBeeHeading("Samuel Hart", 2), "Samuel Hart’s field · 2 people");
  assert.equal(huskingBeesHeading(1), "1 husking bee");
  assert.equal(missingHuskingHeading(1), "1 husking bee still needs a roll");
  const guests = compileHuskingGuests([
    { id: "w", person: "Wei Chen", personId: "w" },
    { id: "r", person: "Robert Hart", personId: "r" },
  ]);
  assert.deepEqual(guests.map((row) => row.person), ["Robert Hart", "Wei Chen"]);
  assert.equal(compileHusking([{ owner: "June", heldOn: "1951-01-01" }, { owner: "Samuel Hart", heldOn: "1950-10-20" }])[0]?.owner, "Samuel Hart");
});

test("a midwife record names mother, child, and who attended", () => {
  assert.equal(midwifeLine("Eleanor Hart", "Margaret Chen", "Lily Chen", "1984-07-21"), "Eleanor Hart attended Margaret Chen · Lily Chen · 1984-07-21");
  assert.equal(midwivesHeading(1), "1 midwife record");
  assert.equal(missingMidwivesHeading(1), "No midwife has been written down");
  assert.equal(compileMidwives([{ id: "b", midwife: "June", mother: "Rose", attendedOn: "1956-04-01" }, { id: "a", midwife: "Eleanor Hart", mother: "Margaret Chen", child: "Lily Chen", attendedOn: "1984-07-21" }])[0]?.mother, "Rose");
});

test("who carved the headstone keeps carver, person, and yard", () => {
  assert.equal(carverLine("Robert Hart", "Eleanor Hart", "Fairview"), "Robert Hart carved Eleanor Hart · Fairview");
  assert.equal(carversHeading(1), "1 headstone carver");
  assert.equal(missingCarversHeading(1), "No headstone carver has been written down");
  assert.equal(compileCarvers([{ id: "b", carver: "June", person: "Louis", yard: "Town" }, { id: "a", carver: "Robert Hart", person: "Eleanor Hart", yard: "Fairview" }])[0]?.person, "Eleanor Hart");
});

test("a charivari lists who came and what they brought, sorted by name", () => {
  assert.equal(charivariGuestLine("Samuel Hart", "a tin pan"), "Samuel Hart · a tin pan");
  assert.equal(charivariHeading("Chen wedding", 2), "Chen wedding · 2 people");
  assert.equal(charivarisHeading(1), "1 charivari");
  assert.equal(missingCharivariHeading(1), "1 charivari still needs a roll");
  const guests = compileCharivariGuests([
    { id: "s", person: "Samuel Hart", personId: "s", noise: "a tin pan" },
    { id: "r", person: "Robert Hart", personId: "r", noise: "a cowbell" },
  ]);
  assert.deepEqual(guests.map((row) => row.person), ["Robert Hart", "Samuel Hart"]);
  assert.equal(compileCharivaris([{ title: "Later", heldOn: "1979-01-01" }, { title: "Chen wedding", heldOn: "1978-06-10" }])[0]?.title, "Chen wedding");
});

test("a cattle brand keeps the mark, whose stock, and the years", () => {
  assert.equal(brandYears("1949-01-01", "1978-12-31"), "1949–1978");
  assert.equal(cattleBrandLine("H-bar", "Samuel Hart", "1949–1978"), "H-bar · Samuel Hart · 1949–1978");
  assert.equal(cattleBrandsHeading(1), "1 cattle brand");
  assert.equal(missingBrandsHeading(1), "No cattle brand has been written down");
  assert.equal(compileBrands([{ id: "b", person: "June", mark: "J", startedOn: "1960-01-01" }, { id: "a", person: "Samuel Hart", mark: "H-bar", startedOn: "1949-01-01" }])[0]?.mark, "H-bar");
});

test("sorghum, sick-watch, and a school-board term stay unused backups", () => {
  assert.equal(sorghumLine("Samuel Hart", "8 gallons", "north farm", 1950), "Samuel Hart boiled 8 gallons · north farm · 1950");
  assert.equal(sorghumHeading(1), "1 sorghum boiling");
  assert.equal(missingSorghumHeading(1), "No sorghum boiling has been written down");
  assert.equal(compileSorghum([{ id: "b", person: "June", gallons: "2", year: 1951 }, { id: "a", person: "Samuel Hart", gallons: "8 gallons", year: 1950 }])[0]?.year, 1950);
  assert.equal(sickWatchLine("Margaret Chen", "Eleanor Hart", "2015-05-28"), "Margaret Chen sat up with Eleanor Hart · 2015-05-28");
  assert.equal(sickWatchesHeading(1), "1 sick-watch sitter");
  assert.equal(missingSickHeading(1), "No sick-watch has been written down");
  assert.equal(compileSickWatches([{ id: "b", sitter: "June", sick: "Rose", sickId: "r", personId: "j", satOn: "2008-10-01" }, { id: "a", sitter: "Margaret Chen", sick: "Eleanor Hart", sickId: "e", personId: "m", satOn: "2015-05-28" }])[0]?.sick, "Eleanor Hart");
  assert.equal(boardYears("1952-01-01", "1958-12-31"), "1952–1958");
  assert.equal(schoolBoardLine("Samuel Hart", "director", "1952–1958"), "Samuel Hart · director · 1952–1958");
  assert.equal(schoolBoardsHeading(1), "1 school-board term");
  assert.equal(missingBoardsHeading(1), "No school-board term has been written down");
  assert.equal(compileBoards([{ id: "b", person: "June", office: "clerk", startedOn: "1960-01-01" }, { id: "a", person: "Samuel Hart", office: "director", startedOn: "1952-01-01" }])[0]?.office, "director");
});

test("quiet nav and start-here stay the same", () => {
  assert.equal(startSteps({ claimed: true, hasStory: true, hasPhoto: true }).length, 3);
  assert.deepEqual(
    quietNavLinks().map((link) => link.href),
    ["/", "/tree", "/ask", "/quiet"],
  );
});
