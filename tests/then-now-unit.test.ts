import assert from "node:assert/strict";
import { test } from "node:test";
import { compileThenNowMap, missingThenNowHeading, thenNowMapHeading, thenNowYearLine } from "../src/lib/thenNowMap";
import { missingPhoneHeading, phoneTreeHeading, phoneTreeLine, sortPhoneTree } from "../src/lib/phoneTree";
import { albumTableHeading, albumTableMark, emptyAlbumTableHeading, emptyTableAlbumsHeading } from "../src/lib/albumTable";
import {
  barePreferredHeading,
  compilePreferredDates,
  confidenceLabel,
  factConfidence,
  preferredDateLine,
  preferredDatesHeading,
} from "../src/lib/factConfidence";
import {
  hasPostmark,
  missingPostmarkHeading,
  postmarkLine,
  postmarkWrittenLine,
  undatedWrittenHeading,
} from "../src/lib/postmark";
import { compileLivingHere, livingHereHeading, stillLivingHere } from "../src/lib/livingHere";
import { archiveFoldersHeading, compileArchiveFolders, decadeFolderHeading, undatedFolderHeading } from "../src/lib/archiveFolders";
import { compileRsvpCard, missingRsvpHeading, rsvpCardHeading, rsvpCardLine } from "../src/lib/rsvpCard";
import { citeThisPage } from "../src/lib/citePage";
import { emptyGuestBookHeading, guestBookHeading, guestBookLine } from "../src/lib/guestBook";

test("a then-and-now map pins the same place in two years", () => {
  assert.equal(thenNowMapHeading("Grange hall"), "Then and now · Grange hall");
  assert.match(thenNowYearLine("1947-10-12", "2024-06-01"), /1947 and 2024/);
  assert.equal(missingThenNowHeading(1), "1 then-and-now pair still needs a place");
  const items = compileThenNowMap([
    {
      id: "mapped",
      title: "The Grange hall, then and now",
      place: { id: "place-grange", name: "Grange hall", latitude: 42.54, longitude: -92.452 },
      thenAsset: { capturedAt: "1947-10-12", title: "Harvest dance, Grange hall" },
      nowAsset: { capturedAt: "2024-06-01", title: "Grange hall today" },
    },
    {
      id: "fallback",
      title: "Cedar Falls porch",
      thenAsset: {
        capturedAt: "1961-07-04",
        place: { id: "place-cedar", name: "Cedar Falls", latitude: 42.5278, longitude: -92.4453 },
      },
      nowAsset: { capturedAt: "2024-07-04" },
    },
    { id: "lost", title: "No place yet", thenAsset: { capturedAt: "1950-01-01" } },
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0]?.placeName, "Grange hall");
  assert.match(items[0]?.years || "", /1947 and 2024/);
  assert.equal(items[1]?.placeName, "Cedar Falls");
});

test("the phone tree calls people in order, with missing order last", () => {
  assert.equal(phoneTreeHeading(3), "3 people to call when news spreads");
  assert.equal(phoneTreeLine("Lily Chen", "319-555-1947", 1), "Call 1 · Lily Chen · 319-555-1947");
  assert.equal(missingPhoneHeading(2), "2 living people still need a phone number");
  const sorted = sortPhoneTree([
    { callOrder: 3, personName: "Robert Hart" },
    { callOrder: null, personName: "Cousin Ned" },
    { callOrder: 1, personName: "Lily Chen" },
    { callOrder: 2, personName: "Margaret Chen" },
  ]);
  assert.deepEqual(
    sorted.map((row) => row.personName),
    ["Lily Chen", "Margaret Chen", "Robert Hart", "Cousin Ned"],
  );
});

test("a reunion table sheet keeps the family watermark", () => {
  assert.equal(albumTableHeading("Harvest years"), "Reunion table sheet · Harvest years");
  assert.equal(albumTableMark("Hart family"), "Hart family · family only");
  assert.match(emptyAlbumTableHeading(), /no photographs/);
  assert.equal(emptyTableAlbumsHeading(1), "1 album still needs photographs for a table sheet");
});

test("a preferred date shows a confidence score from citation quality", () => {
  assert.equal(factConfidence(["original"]), 90);
  assert.equal(factConfidence(["original", "copy"]), 75);
  assert.equal(factConfidence(["unsure"]), 30);
  assert.equal(factConfidence([]), 0);
  assert.match(confidenceLabel(90), /strong/);
  assert.match(preferredDateLine("1947-10-12", 90), /12 October 1947/);
  assert.match(preferredDateLine("1947-10-12", 90), /Confidence 90/);
  assert.equal(preferredDatesHeading(1), "1 preferred date");
  assert.equal(barePreferredHeading(1), "1 preferred date still needs a source");
  const items = compilePreferredDates([
    {
      id: "dance",
      title: "Harvest dance",
      happenedOn: "1947-10-12",
      person: { id: "ellie", displayName: "Eleanor Hart" },
      citations: [{ quality: "original" }],
    },
  ]);
  assert.match(items[0]?.line || "", /Confidence 90 · strong/);
});

test("a postmark stays separate from the written date", () => {
  assert.equal(hasPostmark({ stampText: "Cedar Falls, Iowa" }), true);
  assert.equal(hasPostmark({}), false);
  assert.match(postmarkLine("Cedar Falls, Iowa", "1947-10-19"), /19 October 1947/);
  const line = postmarkWrittenLine("1947-10-18", "Cedar Falls, Iowa", "1947-10-19");
  assert.match(line, /18 October 1947/);
  assert.match(line, /19 October 1947/);
  assert.equal(missingPostmarkHeading(1), "1 letter still needs a postmark");
  assert.equal(undatedWrittenHeading(1), "1 postmarked letter still needs a written date");
});

test("people still living in a place are living and have not moved away", () => {
  assert.equal(stillLivingHere({ deathDate: null }, { endedAt: null }), true);
  assert.equal(stillLivingHere({ deathDate: "2015-06-03" }, { endedAt: null }), false);
  assert.equal(stillLivingHere({ deathDate: null }, { endedAt: "1984-06-01" }), false);
  assert.equal(livingHereHeading("Cedar Falls", 2), "2 people still live in Cedar Falls");
  const people = compileLivingHere([
    { person: { id: "lily", displayName: "Lily Chen", deathDate: null }, endedAt: null },
    { person: { id: "ellie", displayName: "Eleanor Hart", deathDate: "2015-06-03" }, endedAt: null },
    { person: { id: "meg", displayName: "Margaret Chen", deathDate: null }, endedAt: "1984-06-01" },
    { person: { id: "lily", displayName: "Lily Chen", deathDate: null }, endedAt: null },
  ]);
  assert.equal(people.length, 1);
  assert.equal(people[0]?.displayName, "Lily Chen");
});

test("decade folders group archive items by ten-year spans", () => {
  assert.equal(decadeFolderHeading(1940), "1940s folder");
  assert.equal(decadeFolderHeading("undated"), "Undated folder");
  assert.equal(archiveFoldersHeading(2), "2 decade folders");
  assert.equal(undatedFolderHeading(1), "1 archive item still needs a date");
  const folders = compileArchiveFolders([
    { id: "dance", title: "Harvest dance", capturedAt: "1947-10-18" },
    { id: "picnic", title: "Hart picnic", capturedAt: "1961-07-04" },
    { id: "blank", title: "Undated porch", capturedAt: null },
  ]);
  assert.equal(folders[0]?.decade, 1940);
  assert.equal(folders[1]?.decade, 1960);
  assert.equal(folders[2]?.decade, "undated");
  assert.equal(folders[2]?.items[0]?.title, "Undated porch");
});

test("an RSVP card names who is coming", () => {
  assert.equal(rsvpCardHeading("Hart reunion at the north farm"), "RSVP card · Hart reunion at the north farm");
  assert.equal(rsvpCardLine("Lily Chen", true), "Lily Chen will be there");
  assert.equal(rsvpCardLine("Cousin Ned", false), "Cousin Ned cannot come");
  assert.equal(missingRsvpHeading(1), "1 reunion still needs an RSVP");
  const card = compileRsvpCard(
    { title: "Hart reunion", happenedOn: "2026-07-04", place: "North farm" },
    [{ person: { displayName: "Lily Chen" }, coming: true }],
  );
  assert.match(card.when, /4 July 2026/);
  assert.equal(card.guests[0]?.line, "Lily Chen will be there");
});

test("cite this page keeps a stable URL and an accessed date", () => {
  const cite = citeThisPage({ title: "Harvest letter", url: "/letters/doc-harvest", accessedOn: "2026-09-22" });
  assert.equal(cite.heading, "Cite this page");
  assert.match(cite.line, /Harvest letter/);
  assert.match(cite.line, /\/letters\/doc-harvest/);
  assert.match(cite.line, /22 September 2026/);
});

test("the family guest book records a visiting relative", () => {
  assert.equal(guestBookHeading(1), "1 note in the guest book");
  assert.equal(emptyGuestBookHeading(), "No visiting relatives have signed the guest book yet");
  assert.equal(
    guestBookLine("Lily Chen", "Left Sunday rolls on the table."),
    "Lily Chen: Left Sunday rolls on the table.",
  );
});
