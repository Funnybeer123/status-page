import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compileMissingCircles,
  compileOneVoicePrompts,
  compileStoryCircles,
  isStoryCircle,
  missingCircleHeading,
  oneVoiceHeading,
  storyCircleHeading,
  storyCirclesHeading,
} from "../src/lib/storyCircles";
import { foldDiagramHeading, foldHeading, foldLine, foldPanelCount, foldSteps, hasFold, missingFoldHeading } from "../src/lib/letterFold";
import {
  compileInheritances,
  inheritanceLine,
  inheritanceReceiptHeading,
  inheritancesHeading,
  missingInheritanceHeading,
} from "../src/lib/inheritances";
import { missingTentHeading, tableTentHeading, tableTentsHeading, tentMottoLine } from "../src/lib/tableTent";
import {
  compileActivityHeatmap,
  emptyHeatmapHeading,
  heatmapHeading,
  hottestMonthHeading,
  utcMonthKey,
} from "../src/lib/activityHeatmap";
import { favoritePhotoHeading, favoriteStarLabel, favoritesHeading, missingFavoriteHeading } from "../src/lib/favoritePhoto";
import { bilingualAskHeading, missingTranslationHeading, preferAskText } from "../src/lib/ask";
import { anniversaryHeading, anniversaryLine, emptyAnniversaryHeading, firstUploadKey, yearsSinceFirstUpload } from "../src/lib/anniversary";
import {
  compileReunionShifts,
  missingShiftsHeading,
  shiftLine,
  shiftRosterHeading,
  shiftSortKey,
  shiftsHeading,
} from "../src/lib/reunionShifts";
import { missingRelatedCardHeading, relatedCardHeading, relatedCardLine, samePersonCardHeading } from "../src/lib/relatedCard";
import { pickHomeMotto } from "../src/lib/homeMotto";
import { startSteps } from "../src/lib/startHere";
import { quietNavLinks } from "../src/lib/quietMode";

test("a story circle needs two voices on the same prompt", () => {
  assert.equal(isStoryCircle([{ id: "a" }]), false);
  assert.equal(isStoryCircle([{ id: "a" }, { id: "b" }]), true);
  assert.equal(storyCircleHeading("How did the grandparents meet?", 2), "Story circle · How did the grandparents meet? · 2 voices");
  assert.equal(storyCirclesHeading(1), "1 story circle");
  assert.equal(missingCircleHeading(1), "1 prompt still needs a second voice");
  assert.equal(oneVoiceHeading(1), "1 prompt has only one voice");
  const circles = compileStoryCircles([
    {
      id: "met",
      title: "How did the grandparents meet?",
      answers: [
        { id: "1", teller: "Lily Chen", body: "The cottonwoods.", href: "/stories/1" },
        { id: "2", teller: "Margaret Chen", body: "The harvest letter.", href: "/stories/2" },
      ],
    },
    { id: "rolls", title: "Who still makes the Sunday rolls?", answers: [{ id: "3", teller: "Margaret Chen", body: "Lily.", href: "/stories/3" }] },
  ]);
  assert.equal(circles.length, 1);
  assert.equal(circles[0]?.id, "met");
  assert.equal(compileOneVoicePrompts([{ id: "rolls", title: "Rolls", answers: [{ id: "3", teller: "Meg", body: "Lily", href: "/s" }] }]).length, 1);
  assert.equal(compileMissingCircles([{ id: "empty", title: "Empty", answers: [] }]).length, 1);
});

test("a letter fold names how the page was tucked", () => {
  assert.equal(foldLine("in thirds"), "Folded in thirds");
  assert.equal(foldLine(""), "Fold unknown");
  assert.equal(hasFold({ foldPattern: "in thirds" }), true);
  assert.equal(foldPanelCount("in thirds"), 3);
  assert.equal(foldSteps("in thirds").length, 3);
  assert.match(foldDiagramHeading("Harvest letter"), /Harvest letter/);
  assert.equal(foldHeading(1), "1 letter with a fold");
  assert.equal(missingFoldHeading(1), "1 letter still needs a fold");
});

test("who inherited what lists the heir beside the will", () => {
  assert.equal(inheritanceLine("Navy hatband", "Lily Chen"), "Navy hatband · inherited by Lily Chen");
  assert.equal(inheritancesHeading(2), "2 inherited items");
  assert.equal(missingInheritanceHeading(1), "1 will still needs an inheritance table");
  assert.match(inheritanceReceiptHeading("Samuel Hart’s will"), /Samuel Hart/);
  const rows = compileInheritances([
    { id: "farm", title: "North farm", heir: "Robert Hart" },
    { id: "hat", title: "Navy hatband", heir: "Lily Chen" },
  ]);
  assert.equal(rows[0]?.heir, "Lily Chen");
});

test("a table tent prints the preferred family motto", () => {
  assert.match(tableTentHeading("Harvest supper", "Courtesy to the trees"), /Courtesy to the trees/);
  assert.equal(tableTentsHeading(1), "1 reunion table tent");
  assert.equal(missingTentHeading(1), "1 reunion still needs a table tent");
  assert.equal(tentMottoLine(""), "The family has not chosen a motto yet");
  const motto = pickHomeMotto([
    { id: "a", text: "Older saying" },
    { id: "b", text: "Courtesy to the trees", preferred: true },
  ]);
  assert.equal(motto?.text, "Courtesy to the trees");
});

test("the activity heatmap groups additions by UTC month", () => {
  assert.equal(utcMonthKey("2026-09-22T12:00:00Z"), "2026-09");
  assert.equal(heatmapHeading(1), "Archive activity · 1 month");
  assert.equal(emptyHeatmapHeading(), "The activity heatmap is still quiet");
  const heat = compileActivityHeatmap([
    { createdAt: "2026-09-01T12:00:00Z" },
    { createdAt: "2026-09-22T12:00:00Z" },
    { createdAt: "2026-08-02T12:00:00Z" },
  ]);
  assert.equal(heat.months[0]?.month, "2026-08");
  assert.equal(heat.hottest?.month, "2026-09");
  assert.equal(heat.hottest?.count, 2);
  assert.match(hottestMonthHeading("2026-09", 2), /2026-09/);
});

test("a favorite photograph is separate from the profile portrait", () => {
  assert.equal(favoritePhotoHeading("Eleanor Hart"), "Favorite photograph · Eleanor Hart");
  assert.equal(favoritesHeading(1), "1 favorite photograph");
  assert.equal(missingFavoriteHeading(1), "1 person still needs a favorite photograph");
  assert.equal(favoriteStarLabel(true), "Favorite photograph");
});

test("bilingual Ask prefers the translation when one exists", () => {
  assert.equal(preferAskText("English cider", "Cider traducido", true), "Cider traducido");
  assert.equal(preferAskText("English cider", "Cider traducido", false), "English cider");
  assert.equal(preferAskText("English cider", "", true), "English cider");
  assert.equal(bilingualAskHeading(true), "Ask · prefer the translation");
  assert.equal(missingTranslationHeading(1), "1 letter still needs a translation");
});

test("the archive anniversary counts years since the first upload", () => {
  assert.equal(firstUploadKey("2016-03-12T14:00:00Z"), "2016-03-12");
  assert.equal(yearsSinceFirstUpload("2016-03-12T14:00:00Z", new Date("2026-09-22T12:00:00Z")), 10);
  assert.equal(yearsSinceFirstUpload("2016-10-01T14:00:00Z", new Date("2026-09-22T12:00:00Z")), 9);
  assert.equal(yearsSinceFirstUpload(null), null);
  assert.equal(anniversaryHeading(10), "10 years since the first upload");
  assert.equal(anniversaryHeading(0), "The archive is in its first year");
  assert.equal(emptyAnniversaryHeading(), "Nothing has been uploaded yet");
  assert.match(anniversaryLine(10, "2016-03-12"), /first upload 2016-03-12/);
});

test("digitizing shifts sort morning before afternoon", () => {
  assert.equal(shiftSortKey("morning"), "09:00");
  assert.equal(shiftSortKey(null), "9999");
  assert.match(shiftLine("Lily Chen", "Morning scanner", "morning"), /Lily Chen/);
  assert.match(shiftsHeading("Harvest supper", 2), /2 volunteers/);
  assert.equal(missingShiftsHeading(1), "1 reunion still needs a digitizing shift");
  assert.match(shiftRosterHeading("Harvest supper"), /Digitizing roster/);
  const shifts = compileReunionShifts([
    { id: "a", personName: "Margaret Chen", label: "Afternoon indexer", startsAt: "afternoon" },
    { id: "b", personName: "Lily Chen", label: "Morning scanner", startsAt: "morning" },
  ]);
  assert.equal(shifts[0]?.personName, "Lily Chen");
});

test("the related card uses the existing how-we-are-related sentence", () => {
  assert.match(relatedCardHeading("Lily Chen", "Margaret Chen"), /Lily Chen/);
  assert.equal(missingRelatedCardHeading(), "Choose two people for a related card");
  assert.equal(samePersonCardHeading("Lily Chen"), "Lily Chen is the same person");
  assert.equal(
    relatedCardLine({ found: true, sentence: "Lily Chen is the child of Margaret Chen." }),
    "Lily Chen is the child of Margaret Chen.",
  );
});

test("quiet nav and start-here stay the same", () => {
  assert.equal(startSteps({ claimed: true, hasStory: true, hasPhoto: true }).length, 3);
  assert.deepEqual(
    quietNavLinks().map((link) => link.href),
    ["/", "/tree", "/ask", "/quiet"],
  );
});
