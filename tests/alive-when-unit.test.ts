import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aliveWhenHeading,
  bornInYear,
  diedInYear,
  highlightAliveIds,
  missingAliveYearHeading,
  parseAliveYear,
  utcYear,
  wasAliveInYear,
} from "../src/lib/aliveWhen";
import { missingCookHeading, recipeCardHeading, recipeCardPrintLine, recipeCookLine } from "../src/lib/recipeCard";
import { compileMysteryQueue, emptyMysteryHeading, mysteryGuessLine, mysteryHeading } from "../src/lib/photoMystery";
import { compileShopList, missingShopHeading, shopHeading, shopItemLine } from "../src/lib/reunionShop";
import { compileLetterThread, letterEndLabel, markLetterEnds, singleLetterThreadHeading } from "../src/lib/letterThread";
import { compileLifeBookmark, lifeBookmarkHeading, lifeBookmarkPlaces, missingBookmarkPlacesHeading } from "../src/lib/lifeBookmark";
import { missingPlaceNameHeading, placeNameLine, placeNamesHeading } from "../src/lib/placeNames";
import { emptyAuditHeading, trashAuditHeading, trashAuditLine } from "../src/lib/trashAudit";
import { compileReadLater, emptyShelfHeading, readLaterHeading, readLaterLine } from "../src/lib/readLater";
import { arrivedLine, checkinHeading, compileCheckin, kioskArrivedLine, missingCheckinHeading } from "../src/lib/reunionCheckin";
import { recipeHolidayLine } from "../src/lib/recipeHoliday";
import { quietNavLinks } from "../src/lib/quietMode";

test("who was alive in a year uses UTC years only", () => {
  assert.equal(utcYear("1947-10-18"), 1947);
  assert.equal(parseAliveYear("1947"), 1947);
  assert.equal(wasAliveInYear({ birthDate: "1928-03-12", deathDate: "2015-06-03" }, 1947), true);
  assert.equal(wasAliveInYear({ birthDate: "1952-04-02", deathDate: null }, 1947), false);
  assert.equal(wasAliveInYear({ birthDate: null, deathDate: null }, 1947), false);
  assert.equal(wasAliveInYear({ birthDate: null, deathDate: "2018-01-01" }, 1947), true);
  assert.equal(diedInYear({ deathDate: "2015-06-03" }, 2015), true);
  assert.equal(bornInYear({ birthDate: "1928-03-12" }, 1928), true);
  assert.equal(aliveWhenHeading(1947, 2), "Who was alive in 1947 · 2 people");
  assert.equal(missingAliveYearHeading(1), "1 person still needs a birth year");
  assert.deepEqual(
    highlightAliveIds(
      [
        { id: "ellie", birthDate: "1928-03-12", deathDate: "2015-06-03" },
        { id: "ned", birthDate: null, deathDate: null },
      ],
      1947,
    ),
    ["ellie"],
  );
});

test("a recipe card names the cook and the holiday", () => {
  assert.equal(recipeCardHeading("Sunday rolls"), "Recipe card · Sunday rolls");
  assert.equal(recipeCookLine(["Eleanor Hart"]), "Cooked by Eleanor Hart");
  assert.equal(recipeCookLine([]), "Cook unknown");
  assert.match(recipeCardPrintLine("Sunday rolls", ["Eleanor Hart"], "Harvest-dance anniversary supper"), /Cooked by Eleanor Hart/);
  assert.match(recipeHolidayLine("Sunday rolls", "Harvest-dance anniversary supper"), /for Harvest-dance anniversary supper/);
  assert.equal(missingCookHeading(1), "1 recipe still needs a cook");
});

test("the photo mystery queue keeps unidentified faces and guesses", () => {
  assert.equal(mysteryHeading(1), "Photo mystery · 1 unidentified face");
  assert.equal(emptyMysteryHeading(), "Every face has a name");
  assert.equal(mysteryGuessLine("Eleanor Hart", "Lily Chen"), "Eleanor Hart · guessed by Lily Chen");
  const queue = compileMysteryQueue(
    [
      { id: "program", title: "Harvest program", tags: [] },
      { id: "named", title: "Ellie", tags: [{ personId: "ellie" }] },
    ],
    [{ assetId: "program", name: "Eleanor Hart", user: { name: "Lily Chen" } }],
  );
  assert.equal(queue.length, 1);
  assert.match(queue[0]?.guesses[0]?.line || "", /Eleanor Hart/);
});

test("a reunion shopping list lines up plates, chairs, and name tags", () => {
  assert.equal(shopHeading("Hart reunion", 3), "Shopping list · Hart reunion · 3 items");
  assert.equal(shopItemLine("Plates", 48), "Plates · 48");
  assert.equal(missingShopHeading(1), "1 reunion still needs plates, chairs, or name tags");
  const items = compileShopList([
    { label: "Name tags", quantity: 60 },
    { label: "Chairs", quantity: 40 },
    { label: "Plates", quantity: 48 },
  ]);
  assert.deepEqual(items.map((item) => item.label), ["Chairs", "Name tags", "Plates"]);
});

test("first and last letter markers stay additive on the compiled thread", () => {
  const thread = compileLetterThread(
    [
      { id: "harvest", title: "Harvest letter", transcript: "cider", writtenAt: "1947-10-18" },
      { id: "reply", title: "Ruth replies", transcript: "stamp", writtenAt: "1947-10-22", replyToId: "harvest" },
    ],
    "reply",
  );
  const marked = markLetterEnds(thread);
  assert.equal(marked[0]?.firstLetter, true);
  assert.equal(marked[0]?.lastLetter, false);
  assert.equal(marked[1]?.lastLetter, true);
  assert.equal(letterEndLabel(true, false), "First letter");
  assert.equal(letterEndLabel(false, true), "Last letter");
  assert.equal(letterEndLabel(true, true), "First and last letter");
  assert.equal(singleLetterThreadHeading(1), "1 correspondence thread is still a single letter");
});

test("a life bookmark prints the span and key places in residence order", () => {
  assert.equal(lifeBookmarkHeading("Eleanor Hart"), "Life bookmark · Eleanor Hart");
  assert.equal(lifeBookmarkPlaces(["Cedar Falls", "North farm"]), "Cedar Falls · North farm");
  assert.equal(missingBookmarkPlacesHeading(1), "1 person still needs a key place on a bookmark");
  const card = compileLifeBookmark(
    { displayName: "Eleanor Hart", birthDate: "1928-03-12", deathDate: "2015-06-03" },
    [
      { startedAt: "1948-06-14", place: { name: "North farm" } },
      { startedAt: "1928-03-12", place: { name: "Cedar Falls" } },
    ],
  );
  assert.match(card.span, /1928/);
  assert.match(card.places, /Cedar Falls · North farm/);
});

test("the family dictionary of places names a farm the way the family said it", () => {
  assert.equal(placeNameLine("Sam’s place", "North farm"), "Sam’s place · the family name for North farm");
  assert.equal(placeNamesHeading(1), "1 family name for a place");
  assert.equal(missingPlaceNameHeading(2), "2 places still need a family name");
});

test("the trash audit says who put what aside and when", () => {
  assert.equal(trashAuditHeading(1), "1 thing put in the trash");
  assert.equal(emptyAuditHeading(), "The trash audit is empty");
  assert.match(trashAuditLine("Maya Park", "Harvest program", "2026-09-22", "trash"), /Maya Park put in the trash Harvest program/);
});

test("the read-later shelf keeps letters and stories for one relative", () => {
  assert.equal(readLaterHeading(2), "Read later · 2 letters and stories");
  assert.equal(emptyShelfHeading(), "The read-later shelf is empty");
  assert.equal(readLaterLine("Harvest letter", "letter"), "Harvest letter · letter");
  const items = compileReadLater([
    { id: "later", createdAt: "2026-09-22", document: { id: "doc", title: "Harvest letter" } },
    { id: "story", createdAt: "2026-09-21", story: { id: "s1", title: "Cottonwoods this summer" } },
  ]);
  assert.equal(items[0]?.kind, "letter");
  assert.equal(items[1]?.kind, "story");
});

test("a reunion check-in marks who has arrived", () => {
  assert.match(checkinHeading("Hart reunion", 1, 3), /1 of 3 arrived/);
  assert.match(arrivedLine("Lily Chen", "2026-09-22"), /Lily Chen arrived/);
  assert.equal(missingCheckinHeading(1), "1 guest still needs to check in");
  assert.equal(kioskArrivedLine(["Lily Chen"]), "Lily Chen");
  const guests = compileCheckin([
    { arrived: false, person: { id: "june", displayName: "June Whitaker" } },
    { arrived: true, arrivedAt: "2026-09-22T14:00:00Z", person: { id: "lily", displayName: "Lily Chen" } },
  ]);
  assert.equal(guests[0]?.name, "Lily Chen");
  assert.equal(guests[1]?.arrived, false);
});

test("quiet nav stays the same four links", () => {
  assert.deepEqual(
    quietNavLinks().map((link) => link.href),
    ["/", "/tree", "/ask", "/quiet"],
  );
});
