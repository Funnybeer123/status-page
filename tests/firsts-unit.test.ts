import assert from "node:assert/strict";
import { test } from "node:test";
import { RelType } from "@prisma/client";
import {
  compileScrapbook,
  emptyScrapbookHeading,
  peopleWithoutFirstsHeading,
  scrapbookHeading,
  scrapbookLabel,
  undatedFirstsHeading,
} from "../src/lib/scrapbook";
import { compileDrawnPedigree, drawnPedigreeHeading, missingPedigreeHeading } from "../src/lib/drawnPedigree";
import { envelopeHeading, envelopeLine, envelopesHeading, hasEnvelope, missingEnvelopeHeading } from "../src/lib/envelope";
import { emptyVaultHeading, vaultDenied, vaultHeading, vaultLine } from "../src/lib/vault";
import { missingBirthsHeading, needsBirthDate } from "../src/lib/missingBirths";
import { restoreSliderHeading, restoreSliderHint } from "../src/lib/restoreSlider";
import {
  compileHolidayCookbook,
  holidayCookbookHeading,
  recipeHolidayLine,
  untaggedRecipesHeading,
} from "../src/lib/recipeHoliday";
import { missingSpokenHeading, soundboardHeading, spokenNameLine } from "../src/lib/soundboard";
import { bookletFilename, bookletHeading, compilePacketBooklet, missingLettersBookletHeading } from "../src/lib/packetBooklet";
import { isNight, nightQuietHeading, nightSettingsHeading } from "../src/lib/nightMode";

test("the scrapbook pulls tagged firsts and sorts by calendar date", () => {
  assert.equal(scrapbookLabel("house"), "First house");
  assert.equal(scrapbookLabel("car"), "First car");
  assert.equal(scrapbookLabel("child"), "First child");
  assert.equal(scrapbookHeading(3), "3 firsts on the scrapbook page");
  assert.equal(emptyScrapbookHeading(), "The scrapbook is waiting for a first house, car, or child");
  assert.equal(undatedFirstsHeading(1), "1 first still needs a date");
  assert.equal(peopleWithoutFirstsHeading(2), "2 people still need a first");
  const items = compileScrapbook([
    { id: "car", title: "The navy Ford", firstTag: "car", happenedOn: new Date("1950-05-01T00:00:00Z") },
    { id: "undated", title: "Undated first job", firstTag: "job", happenedOn: null },
    { id: "house", title: "The Cedar Falls bungalow", firstTag: "house", happenedOn: "1948-06-20" },
    { id: "skip", title: "Harvest dance", firstTag: null, happenedOn: "1947-10-12" },
  ]);
  assert.equal(items.length, 3);
  assert.equal(items[0]?.title, "The Cedar Falls bungalow");
  assert.equal(items[1]?.title, "The navy Ford");
  assert.equal(items[2]?.title, "Undated first job");
  assert.equal(items[0]?.label, "First house");
});

test("a hand-drawn pedigree names the person and draws parents", () => {
  assert.equal(drawnPedigreeHeading("Rose Whitaker"), "Hand-drawn pedigree of Rose Whitaker");
  assert.equal(missingPedigreeHeading(1), "1 person still needs parents for a pedigree");
  const pedigree = compileDrawnPedigree(
    "rose",
    [
      { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
      { id: "ada", displayName: "Ada Whitaker", birthDate: "1901-02-02", deathDate: "1982-05-09" },
    ],
    [{ type: RelType.parent, fromPersonId: "ada", toPersonId: "rose" }],
  );
  assert.match(pedigree.heading, /Rose Whitaker/);
  assert.match(pedigree.svg, /drawn-pedigree/);
  assert.match(pedigree.svg, /Rose Whitaker/);
  assert.match(pedigree.svg, /Ada Whitaker/);
  assert.equal(pedigree.root?.parents.length, 1);
});

test("an envelope names to, from, and date", () => {
  assert.equal(envelopeHeading("Harvest letter"), "Envelope · Harvest letter");
  assert.match(envelopeLine("Eleanor Whitaker", "Ruth Whitaker", "1947-10-18"), /Eleanor Whitaker to Ruth Whitaker/);
  assert.equal(hasEnvelope({ envelopeFrom: "Eleanor" }), true);
  assert.equal(hasEnvelope({}), false);
  assert.equal(missingEnvelopeHeading(1), "1 letter still needs an envelope");
  assert.equal(envelopesHeading(2), "2 letter envelopes");
});

test("the family vault is only for owners", () => {
  assert.equal(vaultDenied(), "Only an owner can open the family vault.");
  assert.equal(vaultHeading(1), "1 shared account note");
  assert.equal(vaultLine("Ancestry login"), "Ancestry login");
  assert.equal(emptyVaultHeading(), "No shared account notes yet");
});

test("missing birth dates open a person form", () => {
  assert.equal(needsBirthDate({ birthDate: null }), true);
  assert.equal(needsBirthDate({ birthDate: "1929-03-08" }), false);
  assert.equal(missingBirthsHeading(1), "1 person still needs a birth date");
});

test("a restoration slider keeps the before and after words", () => {
  assert.equal(restoreSliderHeading(), "Before and after");
  assert.match(restoreSliderHint(), /original scan/);
});

test("a recipe can be tagged with a holiday", () => {
  assert.equal(recipeHolidayLine("Sunday rolls", "Harvest-dance anniversary supper"), "Sunday rolls · for Harvest-dance anniversary supper");
  assert.equal(untaggedRecipesHeading(1), "1 recipe still needs a holiday");
  assert.equal(holidayCookbookHeading(1), "1 holiday recipe");
  const groups = compileHolidayCookbook([
    { title: "Sunday rolls", holiday: { id: "h1", title: "Harvest-dance anniversary supper" } },
    { title: "Cider cake", holiday: { id: "h1", title: "Harvest-dance anniversary supper" } },
    { title: "Weeknight soup", holiday: null },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.recipes.length, 2);
});

test("the soundboard lists spoken names", () => {
  assert.equal(soundboardHeading(1), "1 spoken name on the soundboard");
  assert.equal(spokenNameLine("Eleanor Hart", "EL-uh-nor hart"), "Eleanor Hart · EL-uh-nor hart");
  assert.equal(missingSpokenHeading(2), "2 people still need a spoken name");
});

test("a packet booklet compiles facts and letters", () => {
  assert.equal(bookletHeading("Rose Whitaker"), "Packet booklet for Rose Whitaker");
  assert.equal(bookletFilename("Rose Whitaker"), "rose-whitaker-booklet.pdf");
  assert.equal(missingLettersBookletHeading(1), "1 packet booklet still needs a letter");
  const chapters = compilePacketBooklet({
    person: { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    letters: [{ title: "Harvest letter", transcript: "I danced three times." }],
    photos: [{ title: "Harvest dance", filename: "dance.svg" }],
    facts: [{ claim: "Rose danced in 1947." }],
  });
  assert.match(chapters[0]?.title || "", /Rose Whitaker/);
  assert.equal(chapters.length, 2);
  assert.match(chapters[1]?.title || "", /Harvest letter/);
});

test("night mode only restyles the quiet view", () => {
  assert.equal(isNight({ nightMode: false }), false);
  assert.equal(isNight({ nightMode: true }), true);
  assert.equal(nightQuietHeading(), "Night quiet");
  assert.equal(nightSettingsHeading(false), "Night mode is off");
  assert.equal(nightSettingsHeading(true), "Night mode is on");
});
