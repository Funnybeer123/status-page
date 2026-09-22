import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compileBeeBlocks,
  compileBees,
  missingBeesHeading,
  quiltingBeeHeading,
  quiltingBeesHeading,
  quiltingBlockLine,
} from "../src/lib/quiltingBee";
import { churchBellLine, churchBellsHeading, compileBells, missingBellsHeading } from "../src/lib/churchBell";
import { boxSocialLine, boxSocialsHeading, compileSocials, missingSocialsHeading } from "../src/lib/boxSocial";
import { compileMailBoxes, mailBoxLine, mailRouteHeading, mailRoutesHeading, missingMailHeading } from "../src/lib/ruralMail";
import { compileWashDays, missingWashHeading, washDayLine, washDaySortKey, washDaysHeading } from "../src/lib/washDay";
import { compileSeedOrders, missingSeedsHeading, seedOrderLine, seedOrdersHeading } from "../src/lib/seedOrder";
import {
  barnJobLine,
  barnRaisingHeading,
  barnRaisingsHeading,
  compileBarnCrew,
  missingBarnsHeading,
} from "../src/lib/barnRaising";
import {
  compileConfirmands,
  confirmationHeading,
  confirmationLine,
  confirmationsHeading,
  missingConfirmationsHeading,
} from "../src/lib/confirmationClass";
import { compileDeathwatches, deathwatchLine, deathwatchesHeading, missingWatchesHeading } from "../src/lib/deathwatch";
import { butterEggLine, butterEggsHeading, compileButterEggs, missingButterHeading } from "../src/lib/butterEgg";
import { compileWells, missingWellsHeading, wellLine, wellsHeading } from "../src/lib/wellRecord";
import { compileOrgans, missingOrgansHeading, parlorOrganLine, parlorOrgansHeading } from "../src/lib/parlorOrgan";
import { compileSundayPins, missingPinsHeading, sundayPinLine, sundayPinsHeading } from "../src/lib/sundaySchoolPin";
import { startSteps } from "../src/lib/startHere";
import { quietNavLinks } from "../src/lib/quietMode";

test("a quilting-bee roll sorts stitchers by name", () => {
  assert.equal(quiltingBlockLine("Eleanor Hart", "Ohio star"), "Eleanor Hart · Ohio star");
  assert.equal(quiltingBeeHeading("Harvest ring bee", 3), "Harvest ring bee · 3 blocks");
  assert.equal(quiltingBeesHeading(1), "1 quilting bee");
  assert.equal(missingBeesHeading(1), "1 quilting bee still needs a block");
  const blocks = compileBeeBlocks([
    { id: "m", person: "Margaret Chen", personId: "m", block: "nine-patch" },
    { id: "e", person: "Eleanor Hart", personId: "e", block: "Ohio star" },
    { id: "l", person: "Lily Chen", personId: "l", block: "friendship" },
  ]);
  assert.deepEqual(blocks.map((row) => row.person), ["Eleanor Hart", "Lily Chen", "Margaret Chen"]);
  assert.equal(compileBees([{ title: "Winter", heldOn: "1953-01-01" }, { title: "Harvest", heldOn: "1952-04-12" }])[0]?.title, "Harvest");
});

test("who rang the church bell keeps the service and the day", () => {
  assert.equal(churchBellLine("Samuel Hart", "Sunday morning", "1948-06-14"), "Samuel Hart rang for Sunday morning · 1948-06-14");
  assert.equal(churchBellsHeading(1), "1 church-bell ringing");
  assert.equal(missingBellsHeading(1), "No one has been written as ringing the bell");
  assert.equal(compileBells([{ id: "b", person: "Wei", service: "vespers", rangOn: "1949-01-01" }, { id: "a", person: "Samuel Hart", service: "Sunday morning", rangOn: "1948-06-14" }])[0]?.person, "Samuel Hart");
});

test("a box-social pairing names who bought whose box", () => {
  assert.equal(boxSocialLine("Wei Chen", "Margaret Chen", "35 cents"), "Wei Chen bought Margaret Chen’s box · 35 cents");
  assert.equal(boxSocialsHeading(1), "1 box-social pairing");
  assert.equal(missingSocialsHeading(1), "No box-social pairing has been written down");
  assert.equal(compileSocials([{ id: "b", buyer: "Ned", seller: "June", heldOn: "1969-01-01" }, { id: "a", buyer: "Wei Chen", seller: "Margaret Chen", heldOn: "1968-10-12" }])[0]?.buyer, "Wei Chen");
});

test("a rural mail route keeps the carrier, boxes, and days", () => {
  assert.equal(mailBoxLine("Eleanor Hart", "14"), "Box 14 · Eleanor Hart");
  assert.equal(mailRouteHeading("Rural Route 2", "Samuel Hart", "Tue Thu Sat"), "Rural Route 2 · Samuel Hart · Tue Thu Sat");
  assert.equal(mailRoutesHeading(1), "1 rural mail route");
  assert.equal(missingMailHeading(1), "The rural mail route is still empty");
  const boxes = compileMailBoxes([
    { id: "b", person: "June", boxNumber: "2" },
    { id: "a", person: "Eleanor Hart", boxNumber: "14" },
  ]);
  assert.deepEqual(boxes.map((row) => row.boxNumber), ["2", "14"]);
});

test("wash day sorts Monday first, then through Sunday", () => {
  assert.equal(washDaySortKey("Monday"), "01");
  assert.equal(washDayLine("Eleanor Hart", "Monday"), "Eleanor Hart · Monday");
  assert.equal(washDaysHeading(1), "1 wash-day household");
  assert.equal(missingWashHeading(1), "The wash-day schedule is still empty");
  const days = compileWashDays([
    { weekday: "Sunday", person: "June" },
    { weekday: "Monday", person: "Eleanor Hart" },
    { weekday: "Wednesday", person: "Rose" },
  ]);
  assert.deepEqual(days.map((row) => row.weekday), ["Monday", "Wednesday", "Sunday"]);
});

test("a spring seed order keeps variety, quantity, and supplier", () => {
  assert.equal(seedOrderLine("Early Ohio potatoes", "2 sacks", "Iowa Seed Co."), "Early Ohio potatoes · 2 sacks · Iowa Seed Co.");
  assert.equal(seedOrdersHeading(1), "1 spring seed order");
  assert.equal(missingSeedsHeading(1), "The spring seed order is still empty");
  assert.equal(compileSeedOrders([{ id: "b", person: "June", variety: "beans", quantity: "1", supplier: "A", year: 1953 }, { id: "a", person: "Samuel Hart", variety: "Early Ohio potatoes", quantity: "2 sacks", supplier: "Iowa Seed Co.", year: 1952 }])[0]?.year, 1952);
});

test("a barn-raising crew sorts by job, then name", () => {
  assert.equal(barnJobLine("Samuel Hart", "frame"), "Samuel Hart · frame");
  assert.equal(barnRaisingHeading("North-farm barn", 3), "North-farm barn · 3 people");
  assert.equal(barnRaisingsHeading(1), "1 barn raising");
  assert.equal(missingBarnsHeading(1), "1 barn raising still needs a crew");
  const crew = compileBarnCrew([
    { id: "r", person: "Robert Hart", personId: "r", job: "rafter" },
    { id: "s", person: "Samuel Hart", personId: "s", job: "frame" },
    { id: "w", person: "Wei Chen", personId: "w", job: "peg" },
  ]);
  assert.deepEqual(crew.map((row) => row.job), ["frame", "peg", "rafter"]);
});

test("a confirmation-class roll sorts confirmands by name", () => {
  assert.equal(confirmationLine("Eleanor Hart", "St. John's", 1945), "Eleanor Hart · St. John's · 1945");
  assert.equal(confirmationHeading("St. John's", 1945, 1), "St. John's · 1945 · 1 confirmand");
  assert.equal(confirmationsHeading(1), "1 confirmation class");
  assert.equal(missingConfirmationsHeading(1), "1 confirmation class still needs a roll");
  const pupils = compileConfirmands([
    { id: "j", person: "June Whitaker", personId: "j" },
    { id: "e", person: "Eleanor Hart", personId: "e" },
  ]);
  assert.deepEqual(pupils.map((row) => row.person), ["Eleanor Hart", "June Whitaker"]);
});

test("who sat the deathwatch keeps the night", () => {
  assert.equal(deathwatchLine("Margaret Chen", "Eleanor Hart", "2015-06-02"), "Margaret Chen sat with Eleanor Hart · 2015-06-02");
  assert.equal(deathwatchesHeading(1), "1 deathwatch sitter");
  assert.equal(missingWatchesHeading(1), "1 funeral still needs a deathwatch");
  assert.equal(compileDeathwatches([{ id: "b", deceased: "Louis", sitter: "June", deceasedId: "l", personId: "j", watchedOn: "2011-01-13" }, { id: "a", deceased: "Eleanor Hart", sitter: "Margaret Chen", deceasedId: "e", personId: "m", watchedOn: "2015-06-02" }])[0]?.deceased, "Eleanor Hart");
});

test("a butter-and-egg account names the store, the book, and the year", () => {
  assert.equal(butterEggLine("Eleanor Hart", "Market Street", "Whitaker 3", 1961), "Eleanor Hart · Market Street · Whitaker 3 · 1961");
  assert.equal(butterEggsHeading(1), "1 butter-and-egg account");
  assert.equal(missingButterHeading(1), "No butter-and-egg account has been written down");
  assert.equal(compileButterEggs([{ id: "b", person: "June", store: "North store", account: "2", year: 1962 }, { id: "a", person: "Eleanor Hart", store: "Market Street", account: "Whitaker 3", year: 1961 }])[0]?.store, "Market Street");
});

test("well depth, parlor organ, and a Sunday-school pin stay unused backups", () => {
  assert.equal(wellLine("Samuel Hart", "north farm", "42 feet", 1949), "Samuel Hart dug north farm · 42 feet · 1949");
  assert.equal(wellsHeading(1), "1 well");
  assert.equal(missingWellsHeading(1), "No well has been written down");
  assert.equal(compileWells([{ id: "b", person: "June", place: "town", depth: "20 feet", year: 1960 }, { id: "a", person: "Samuel Hart", place: "north farm", depth: "42 feet", year: 1949 }])[0]?.place, "north farm");
  assert.equal(parlorOrganLine("Eleanor Hart", "cottage organ", "north-farm parlor"), "Eleanor Hart played cottage organ · north-farm parlor");
  assert.equal(parlorOrgansHeading(1), "1 parlor organ");
  assert.equal(missingOrgansHeading(1), "No parlor organ has been written down");
  assert.equal(compileOrgans([{ id: "b", person: "June", title: "reed organ" }, { id: "a", person: "Eleanor Hart", title: "cottage organ" }])[0]?.title, "cottage organ");
  assert.equal(sundayPinLine("Lily Chen", 1996, "St. John's"), "Lily Chen · St. John's · 1996");
  assert.equal(sundayPinsHeading(1), "1 Sunday-school pin");
  assert.equal(missingPinsHeading(1), "No Sunday-school pin has been written down");
  assert.equal(compileSundayPins([{ id: "b", person: "June", year: 1998 }, { id: "a", person: "Lily Chen", year: 1996, church: "St. John's" }])[0]?.year, 1996);
});

test("quiet nav and start-here stay the same", () => {
  assert.equal(startSteps({ claimed: true, hasStory: true, hasPhoto: true }).length, 3);
  assert.deepEqual(
    quietNavLinks().map((link) => link.href),
    ["/", "/tree", "/ask", "/quiet"],
  );
});
