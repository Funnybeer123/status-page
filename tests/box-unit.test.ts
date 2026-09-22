import assert from "node:assert/strict";
import { test } from "node:test";
import { boxFileLine, boxHeading, boxItemLine, isUnsorted } from "../src/lib/box";
import { chainsHeading, currentHolder, currentHolderLine, holdLine, provenanceHeading, sortHolds } from "../src/lib/provenance";
import { generationHeading, hangPortraitLine, missingPortraitsHeading, portraitAssetId, portraitWallHeading } from "../src/lib/portraits";
import {
  isTranscriptLocked,
  lockConflictMessage,
  lockedLettersHeading,
  transcriptCreditLine,
  transcriptCreditsHeading,
  transcriptLockHeading,
} from "../src/lib/transcriptLock";
import { muteHeading, muteLine, mutedFollowsHeading } from "../src/lib/follows";
import { deedHeading, deedLine, hasDeed, missingDeedsHeading } from "../src/lib/deed";
import { buildAgePyramid, pyramidBandLine, pyramidHeading } from "../src/lib/pyramid";
import { attendeesLine, meetingHeading, meetingLine, meetingNotesLine } from "../src/lib/meetings";
import { mineExportFilename, mineExportHeading, mineManifestLine } from "../src/lib/mineExport";
import { clusterSurnames, surnameClusterLine, surnameMapHeading } from "../src/lib/surnameMap";

test("the unsorted box and filing read the way a relative would say them", () => {
  assert.equal(boxHeading(0), "Nothing left in the unsorted box");
  assert.equal(boxHeading(1), "1 upload not filed to a person yet");
  assert.match(boxHeading(3), /3 uploads not filed/);
  assert.equal(boxItemLine("  "), "An untitled upload");
  assert.equal(boxFileLine("Harvest program", "Eleanor Hart"), "Harvest program filed onto Eleanor Hart");
  assert.equal(isUnsorted({ tags: [] }), true);
  assert.equal(isUnsorted({ tags: [{ personId: "p" }] }), false);
});

test("heirloom provenance stays in the order people held the item", () => {
  assert.equal(provenanceHeading("Ellie’s cedar chest", 0), "Who held Ellie’s cedar chest is not recorded yet");
  assert.equal(provenanceHeading("Ellie’s cedar chest", 3), "3 people held Ellie’s cedar chest");
  assert.equal(holdLine("Eleanor Hart", "14 June 1948", "1 September 1995"), "Eleanor Hart · 14 June 1948 – 1 September 1995");
  const holds = sortHolds([
    { heldFrom: "1995-09-01", createdAt: "2026-01-02" },
    { heldFrom: "1948-06-14", createdAt: "2026-01-01" },
    { heldFrom: null, createdAt: "2026-01-03" },
  ]);
  assert.equal(holds[0]?.heldFrom, "1948-06-14");
  assert.equal(holds[2]?.heldFrom, null);
  assert.equal(currentHolder([{ heldUntil: "1995-09-01" }, { heldUntil: null }])?.heldUntil, null);
  assert.equal(currentHolderLine("Ellie’s cedar chest", "Lily Chen"), "Ellie’s cedar chest is with Lily Chen");
  assert.equal(chainsHeading(1), "1 heirloom has a provenance chain");
});

test("portraits, transcript locks, mute, deeds, and the pyramid", () => {
  assert.equal(portraitAssetId({ id: "e", profileAssetId: "a" }, []), "a");
  assert.equal(portraitAssetId({ id: "e" }, [{ personId: "e", assetId: "p" }]), "p");
  assert.equal(generationHeading(0, 1), "The eldest generation · 1 portrait");
  assert.equal(portraitWallHeading(2), "2 portraits on the wall");
  assert.equal(missingPortraitsHeading(0), "Everyone has a portrait");
  assert.equal(hangPortraitLine("June Whitaker"), "Portrait hung for June Whitaker");
  assert.equal(isTranscriptLocked({ transcriptLockedAt: null }), false);
  assert.equal(isTranscriptLocked({ transcriptLockedAt: "2026-03-01" }), true);
  assert.equal(transcriptCreditLine("Lily Chen"), "Transcribed by Lily Chen");
  assert.equal(transcriptLockHeading(true), "This transcript is finished and locked");
  assert.equal(lockedLettersHeading(1), "1 letter transcript is finished");
  assert.equal(transcriptCreditsHeading(0), "No transcription credits yet");
  assert.match(lockConflictMessage(), /locked/);
  assert.equal(muteHeading(true), "Notices from this person are muted");
  assert.equal(mutedFollowsHeading(1), "1 muted follow");
  assert.equal(muteLine("Samuel Hart", true), "Samuel Hart · notices muted");
  assert.equal(hasDeed({ assetId: "d" }), true);
  assert.equal(deedHeading("North farm"), "Deed image · North farm");
  assert.equal(deedLine(""), "The deed image");
  assert.equal(missingDeedsHeading(0), "Every land abstract has its deed image");
  const pyramid = buildAgePyramid(
    [
      { id: "maya", displayName: "Maya Park", birthDate: "1983-01-30", deathDate: null },
      { id: "june", displayName: "June Whitaker", birthDate: "1956-04-01", deathDate: null },
      { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    ],
    new Date("2026-09-22"),
  );
  assert.equal(pyramid.heading, "2 living relatives on the age pyramid");
  assert.equal(pyramid.bands.find((band) => band.key === "30-44")?.count, 1);
  assert.equal(pyramid.bands.find((band) => band.key === "60-74")?.count, 1);
  assert.equal(pyramidBandLine("30 to 44", 1), "30 to 44 · 1 person");
  assert.equal(pyramidHeading(0), "No living relatives to chart yet");
});

test("meetings, a download of what I added, and surname clusters", () => {
  assert.equal(meetingHeading(0), "No family meeting notes yet");
  assert.equal(meetingHeading(1), "1 family meeting");
  assert.equal(meetingLine("Harvest planning", "20 March 2026"), "Harvest planning · 20 March 2026");
  assert.equal(meetingNotesLine("  "), "No notes were written down.");
  assert.equal(attendeesLine(["Lily Chen", "Margaret Chen"]), "Lily Chen and Margaret Chen");
  assert.equal(mineExportHeading(0), "You have not added anything yet");
  assert.equal(mineExportHeading(4), "4 things you added");
  assert.equal(mineExportFilename("Lily Chen"), "lily-chen-added.zip");
  assert.equal(mineManifestLine("journal", "Cider"), "journal: Cider");
  assert.equal(surnameMapHeading(0), "No surname clusters on the map yet");
  assert.equal(surnameClusterLine("Hart", "Cedar Falls", 2), "2 Hart at Cedar Falls");
  const clusters = clusterSurnames(
    [
      { id: "e", displayName: "Eleanor Hart", familyName: "Hart" },
      { id: "m", displayName: "Margaret Chen", familyName: "Chen" },
    ],
    [
      { personId: "e", place: { name: "Cedar Falls", locality: "Cedar Falls", latitude: 42.5278, longitude: -92.4453 } },
      { personId: "m", place: { name: "Iowa City", locality: "Iowa City" } },
    ],
  );
  assert.ok(clusters.some((cluster) => cluster.surname === "Hart" && cluster.place === "Cedar Falls"));
  assert.ok(clusters.some((cluster) => cluster.surname === "Chen"));
});
