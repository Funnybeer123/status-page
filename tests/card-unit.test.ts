import assert from "node:assert/strict";
import { test } from "node:test";
import { RelType } from "@prisma/client";
import { cardsHeading, compileIndexCard, indexCardDates, indexCardHeading, missingParentsHeading, noChildrenHeading, undatedCardsHeading } from "../src/lib/indexCard";
import { emptyFilmstripsHeading, familyFilmstripHeading, filmstripHeading, sortFilmstrip } from "../src/lib/filmstrip";
import { fragileLettersHeading, fragileOriginalLabel, notFragileHeading } from "../src/lib/fragileLetter";
import { emptyPlaylistHeading, missingOralHeading, oralPlaylistHeading, playlistLine, sortOralPlaylist, undatedOralHeading } from "../src/lib/oralPlaylist";
import { addressCardLine, missingResidencesHeading, residenceCompareHeading, sortResidences } from "../src/lib/residenceMap";
import { thankYouEmpty, thankYouHeading, thankYouNote } from "../src/lib/thankYou";
import { bareProofHeading, compileProofBoard, proofBoardHeading, proofHasImage, sameClaim } from "../src/lib/proofBoard";
import { albumZipEmptyMessage, albumZipName, emptyAlbumsHeading } from "../src/lib/albumZip";
import { generationDepth, generationRowLabel } from "../src/lib/generationDepth";
import { isQuiet, quietHomeHeading, quietNavLinks, quietSettingsHeading } from "../src/lib/quietMode";

test("an index card names dates, parents, spouses, and children", () => {
  assert.equal(indexCardHeading("Eleanor Hart"), "Index card for Eleanor Hart");
  assert.match(indexCardDates("1928-03-12", "2015-06-03"), /1928 – 2015/);
  const card = compileIndexCard({
    person: { id: "eleanor", displayName: "Eleanor Hart", birthDate: "1928-03-12", deathDate: "2015-06-03" },
    people: [
      { id: "eleanor", displayName: "Eleanor Hart" },
      { id: "samuel", displayName: "Samuel Hart" },
      { id: "margaret", displayName: "Margaret Chen" },
      { id: "ada", displayName: "Ada Whitaker" },
    ],
    relationships: [
      { fromPersonId: "ada", toPersonId: "eleanor", type: RelType.parent },
      { fromPersonId: "eleanor", toPersonId: "samuel", type: RelType.partner },
      { fromPersonId: "eleanor", toPersonId: "margaret", type: RelType.parent },
    ],
  });
  assert.equal(card.parentLine, "Ada Whitaker");
  assert.equal(card.spouseLine, "Samuel Hart");
  assert.equal(card.childLine, "Margaret Chen");
  assert.equal(cardsHeading(1), "1 index card");
  assert.equal(missingParentsHeading(1), "1 index card still needs parents");
  assert.equal(noChildrenHeading(2), "2 index cards list no children");
  assert.equal(undatedCardsHeading(0), "Every index card has dates");
});

test("a filmstrip sorts photographs by calendar date, not weekday text", () => {
  const sorted = sortFilmstrip([
    { title: "Picnic", capturedAt: "1961-07-04" },
    { title: "Dance", capturedAt: "1947-10-18" },
    { title: "Wedding", capturedAt: new Date("1948-06-14T00:00:00Z") },
  ]);
  assert.equal(sorted[0]?.title, "Dance");
  assert.equal(sorted[1]?.title, "Wedding");
  assert.equal(sorted[2]?.title, "Picnic");
  assert.equal(filmstripHeading("Eleanor Hart", 2), "2 photographs of Eleanor Hart");
  assert.equal(emptyFilmstripsHeading(1), "1 person still needs a photograph");
  assert.equal(familyFilmstripHeading(3), "3 photographs in the family filmstrip");
});

test("a fragile original has a clear label", () => {
  assert.equal(fragileOriginalLabel(), "Fragile original");
  assert.equal(fragileLettersHeading(1), "1 fragile original");
  assert.equal(notFragileHeading(2), "2 letters are not marked fragile");
});

test("the oral playlist is in date order", () => {
  const sorted = sortOralPlaylist([
    { title: "Later reel", capturedAt: new Date("1961-07-04T00:00:00Z") },
    { title: "Harvest reel", capturedAt: "1947-10-18" },
  ]);
  assert.equal(sorted[0]?.title, "Harvest reel");
  assert.match(playlistLine("Harvest reel", "18 October 1947"), /Harvest reel/);
  assert.equal(oralPlaylistHeading(2), "2 oral histories in the playlist");
  assert.equal(emptyPlaylistHeading(), "The oral-history playlist is empty");
  assert.equal(undatedOralHeading(1), "1 oral history still needs a date");
  assert.equal(missingOralHeading(1), "1 person still needs an oral history");
});

test("two people’s residences can sit on one map", () => {
  assert.equal(residenceCompareHeading("Eleanor Hart", "Samuel Hart"), "Residences of Eleanor Hart and Samuel Hart");
  const sorted = sortResidences([
    { startedAt: "1952-04-02" },
    { startedAt: new Date("1948-06-14T00:00:00Z") },
  ]);
  assert.equal(String(sorted[0]?.startedAt).slice(0, 10), "1948-06-14");
  assert.equal(missingResidencesHeading(1), "1 person still needs a residence");
  assert.match(addressCardLine("Eleanor Hart", { name: "Cedar Falls", region: "Iowa" }), /Cedar Falls/);
});

test("a thank-you note names who added what", () => {
  assert.equal(thankYouHeading(), "A thank-you note");
  assert.match(thankYouNote({ actorName: "Maya Park", title: "Cottonwoods this summer", verb: "added" }), /Dear Maya Park/);
  assert.match(thankYouNote({ actorName: "Maya Park", title: "Cottonwoods this summer", verb: "added" }), /Cottonwoods this summer/);
  assert.equal(thankYouEmpty(), "Nothing has been added yet to thank anyone for.");
});

test("a proof board gathers citations and images for one fact", () => {
  assert.match(proofBoardHeading("They met at the harvest dance."), /They met at the harvest dance/);
  assert.equal(sameClaim("They met.", "they met."), true);
  assert.equal(proofHasImage({ assetId: "photo-1" }), true);
  const board = compileProofBoard(
    {
      id: "c1",
      claim: "They met at the harvest dance.",
      document: { id: "doc-1", title: "Harvest letter", asset: { id: "scan-1", title: "Letter scan", storagePath: "a.svg" } },
    },
    [
      { id: "c2", claim: "They met at the harvest dance.", asset: { id: "photo-1", title: "Dance", storagePath: "b.svg" } },
      { id: "c3", claim: "A different fact." },
    ],
  );
  assert.equal(board.citations.length, 2);
  assert.equal(board.images.length, 2);
  assert.equal(bareProofHeading(1), "1 fact still needs a supporting image");
});

test("an album ZIP uses a family filename", () => {
  assert.equal(albumZipName("Harvest years"), "harvest-years-album.zip");
  assert.equal(emptyAlbumsHeading(1), "1 album still needs a photograph");
  assert.equal(albumZipEmptyMessage(), "This album has no photographs to export.");
});

test("the generation depth chart counts people at each generation", () => {
  const people = [
    { id: "ada", displayName: "Ada", profileUrl: null },
    { id: "rose", displayName: "Rose", profileUrl: null },
  ] as Parameters<typeof generationDepth>[0];
  const chart = generationDepth(people, [
    { id: "r1", familyId: "f", fromPersonId: "ada", toPersonId: "rose", type: RelType.parent, startedAt: null, endedAt: null, endedKind: null },
  ] as Parameters<typeof generationDepth>[1]);
  assert.equal(chart.rows[0]?.count, 1);
  assert.equal(chart.rows[1]?.count, 1);
  assert.match(generationRowLabel(1, 2), /Generation 2 · 2 people/);
});

test("quiet mode keeps only the tree and Ask", () => {
  assert.equal(quietHomeHeading(), "The tree and Ask");
  assert.equal(quietSettingsHeading(true), "Quiet mode is on");
  assert.equal(isQuiet({ quietMode: false }), false);
  const hrefs = quietNavLinks().map((link) => link.href);
  assert.deepEqual(hrefs, ["/", "/tree", "/ask", "/quiet"]);
});
