import assert from "node:assert/strict";
import { test } from "node:test";
import { askCitationLine, askStoriesHeading, askStoryHeading, askStorySavedLine } from "../src/lib/askStory";
import { highlightHeading, highlightHitCount, highlightSearchWords, letterSearchHref } from "../src/lib/searchHighlight";
import { plotHasPosition, plotMapHeading, plotPinLine, unmappedPlotsHeading } from "../src/lib/cemeteryPlotMap";
import { bringLine, bringListHeading, compileBringList, missingBringHeading } from "../src/lib/reunionBring";
import { familyOverlapsHeading, overlapCallout, overlapHeading, overlappingPairs, rangesOverlap } from "../src/lib/occupations";
import { chroniclePhotosHeading } from "../src/lib/placeChronicle";
import { lettersIndexHeading, sortLettersByDate, undatedLettersHeading } from "../src/lib/lettersIndex";
import {
  activityCategory,
  filterBirthdayReminders,
  filterMutedNotifications,
  muteCategoryLine,
  mutedCategoriesHeading,
  noticeCategoryFrom,
} from "../src/lib/noticeMute";
import { biblePageHeading, hasBiblePage, missingBiblePagesHeading } from "../src/lib/biblePage";
import { missingObituaryPortraitsHeading, obituaryPortraitHeading, obituaryPortraitLine } from "../src/lib/obituaryPortrait";

test("an Ask answer becomes an editable story with the citations kept", () => {
  assert.equal(askStoryHeading(), "Saved as a family story");
  assert.match(askStorySavedLine("How did grandma meet grandpa?"), /Saved as a family story/);
  assert.equal(askStoriesHeading(0), "No Ask answers saved as stories yet");
  assert.equal(askStoriesHeading(1), "1 Ask answer saved as a story");
  assert.equal(askCitationLine("Harvest letter"), "Harvest letter");
});

test("search words are highlighted inside a letter", () => {
  assert.equal(letterSearchHref("doc-1", "hatband"), "/letters/doc-1?q=hatband");
  assert.equal(letterSearchHref("doc-1"), "/letters/doc-1");
  assert.equal(highlightHitCount("I found Rose's hatband letter.", "hatband"), 1);
  assert.match(highlightSearchWords("I found Rose's hatband letter.", "hatband"), /<mark>hatband<\/mark>/);
  assert.match(highlightHeading("hatband", 2), /2 matches for “hatband”/);
});

test("a cemetery plot map names who is buried in each plot", () => {
  assert.equal(plotHasPosition({ x: 42, y: 38 }), true);
  assert.equal(plotHasPosition({ x: null, y: 38 }), false);
  assert.match(plotMapHeading("Fairview Cemetery", 2), /2 plots on the map at Fairview/);
  assert.equal(plotPinLine("Eleanor Hart", "Lot 14"), "Eleanor Hart · Lot 14");
  assert.equal(unmappedPlotsHeading(0), "Every plot has a place on the map");
});

test("a reunion bring-list names photos, heirlooms, dishes, and who is bringing each", () => {
  assert.match(bringListHeading(3), /3 things on the bring-list/);
  assert.match(bringLine("heirloom", "Cedar chest", "Margaret Chen"), /Margaret Chen is bringing it/);
  const list = compileBringList({
    brings: [{ id: "p1", kind: "photo", title: "Picnic", personName: "Lily Chen" }],
    dishes: [{ id: "d1", title: "Sunday rolls", personName: "Margaret Chen" }],
  });
  assert.equal(list.length, 2);
  assert.ok(list.some((item) => item.kind === "dish" && /Margaret Chen/.test(item.line)));
  assert.equal(missingBringHeading(0), "Every reunion has a bring-list");
});

test("overlapping jobs are called out on an occupation timeline", () => {
  assert.equal(rangesOverlap("1946-03-01", "1952-06-01", "1950-01-01", "1954-01-01"), true);
  assert.equal(rangesOverlap("1948-06-14", "1987-11-01", "1988-06-01", null), false);
  assert.equal(rangesOverlap(null, null, "1950-01-01", "1951-01-01"), false);
  const pairs = overlappingPairs([
    { title: "Milliner", startedOn: "1946-03-01", endedOn: "1952-06-01" },
    { title: "Hat shop keeper", startedOn: "1950-01-01", endedOn: "1956-01-01" },
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(overlapCallout("Milliner", "Hat shop keeper"), "Milliner overlaps Hat shop keeper");
  assert.equal(overlapHeading(1), "1 overlapping job on this timeline");
  assert.equal(familyOverlapsHeading(1), "1 person has overlapping jobs");
});

test("chronicle photos, letters in date order, notice mutes, Bible pages, and obituary portraits", () => {
  assert.match(chroniclePhotosHeading("Cedar Falls", 1), /1 photograph on the chronicle/);
  assert.equal(lettersIndexHeading(2), "2 letters in the family, in date order");
  const sorted = sortLettersByDate([
    { writtenAt: "1952-06-14", title: "later" },
    { writtenAt: "1947-10-18", title: "earlier" },
    { writtenAt: null, title: "undated" },
  ]);
  assert.equal(sorted[0]?.title, "earlier");
  assert.equal(sorted[2]?.title, "undated");
  assert.equal(undatedLettersHeading(1), "1 letter still needs a date");
  assert.equal(activityCategory("photo"), "upload");
  assert.equal(noticeCategoryFrom("A story was added about Rose", "/stories/s1"), "follow");
  assert.equal(mutedCategoriesHeading(1), "1 notice category muted");
  assert.match(muteCategoryLine("birthday", true), /muted/);
  const hidden = filterMutedNotifications(
    [{ title: "uploaded Picnic", href: "/archive/a1" }],
    ["upload"],
  );
  assert.equal(hidden.length, 0);
  assert.equal(filterBirthdayReminders([{ kind: "birthday", title: "Maya's birthday" }], ["birthday"]).length, 0);
  assert.equal(hasBiblePage({ assetId: "a1" }), true);
  assert.match(biblePageHeading("Hart family Bible"), /Bible page/);
  assert.equal(missingBiblePagesHeading(0), "Every Bible record has its page image");
  assert.match(obituaryPortraitHeading("Eleanor Hart"), /Memorial portrait/);
  assert.match(obituaryPortraitLine("Eleanor Hart of Cedar Falls", "Eleanor Hart"), /Eleanor Hart/);
  assert.equal(missingObituaryPortraitsHeading(0), "Every obituary is linked to a memorial portrait");
});
