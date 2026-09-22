import assert from "node:assert/strict";
import { test } from "node:test";
import { compileThisYear, thisYearHeading, yearOf, yearbookHeading } from "../src/lib/thisYear";
import { phoneticHeading, phoneticPeople, soundex, soundsLike } from "../src/lib/phonetic";
import {
  collapseOccupancy,
  occupancyByYear,
  occupancyGapHeading,
  occupancyGaps,
  occupancyHeading,
  occupancySpanLine,
  stayLine,
} from "../src/lib/homeYears";
import {
  assignedHeading,
  bannerHeading,
  classHeading,
  classLine,
  directoryHeading,
  directoryLine,
  normalizePaperKind,
  paperHeading,
  paperLine,
  thereHeading,
  thereLine,
} from "../src/lib/cityDirectory";
import { progressHeading, progressSteps, remainingSteps, startHeading, startSteps } from "../src/lib/startHere";
import {
  classmatesHeading,
  classmatesOf,
  missingDirectoryHeading,
  missingDirectoryPeople,
  papersNeeded,
  papersNeededHeading,
  suggestThere,
  thereSuggestHeading,
} from "../src/lib/yearExtras";

test("this year gathers births, deaths, stories, and photographs", () => {
  const items = compileThisYear({
    year: 2026,
    people: [
      { id: "ivy", displayName: "Ivy Park", birthDate: "2026-01-15" },
      { id: "hugh", displayName: "Hugh Whitaker", deathDate: "2026-03-01" },
      { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    ],
    stories: [{ id: "s1", title: "Sunday rolls from Maya", recordedAt: "2026-03-12" }],
    photos: [{ id: "p1", title: "Reunion picnic", capturedAt: "2026-07-04" }],
    letters: [{ id: "l1", title: "A later typing", writtenAt: "1952-06-14" }],
    events: [{ id: "e1", title: "Hart reunion", personId: "maya", happenedOn: "2026-07-04" }],
  });
  assert.equal(items.filter((item) => item.kind === "birth")[0]?.title, "Ivy Park was born");
  assert.equal(items.filter((item) => item.kind === "death")[0]?.title, "Hugh Whitaker died");
  assert.ok(items.some((item) => item.kind === "story"));
  assert.ok(items.some((item) => item.kind === "photo"));
  assert.ok(items.some((item) => item.kind === "event"));
  assert.equal(items.some((item) => item.kind === "letter"), false);
  assert.equal(yearOf("2026-07-04"), 2026);
  assert.match(thisYearHeading(2026, 5), /5 things from 2026/);
  assert.equal(yearbookHeading(2026, 1), "1 photograph from 2026");
});

test("a misspelling still sounds like the family name", () => {
  assert.equal(soundex("Whitaker"), soundex("Whiticker"));
  assert.equal(soundex("Whitaker"), "W326");
  assert.ok(soundsLike("Whiticker", "Rose Whitaker"));
  assert.equal(soundex("Ashcraft"), "A261");
  const people = phoneticPeople("Whiticker", [
    { displayName: "Rose Whitaker", familyName: "Whitaker" },
    { displayName: "Maya Park", familyName: "Park" },
  ]);
  assert.equal(people[0]?.displayName, "Rose Whitaker");
  assert.match(phoneticHeading("Whiticker", 1), /1 name sounds like/);
});

test("who lived in a home is listed year by year", () => {
  const stays = [
    { personId: "rose", name: "Rose Whitaker", startedOn: "1948-06-14", endedOn: "1950-12-31" },
    { personId: "louis", name: "Louis Whitaker", startedOn: "1949-01-01", endedOn: "1951-12-31" },
  ];
  const years = occupancyByYear(stays, 1948, 1951);
  assert.deepEqual(years.find((row) => row.year === 1948)?.people.map((person) => person.name), ["Rose Whitaker"]);
  assert.deepEqual(
    years.find((row) => row.year === 1949)?.people.map((person) => person.name),
    ["Louis Whitaker", "Rose Whitaker"],
  );
  const spans = collapseOccupancy(years);
  assert.equal(spans[0]?.from, 1948);
  assert.equal(spans[0]?.to, 1948);
  assert.match(occupancySpanLine(spans[1]!), /1949–1950/);
  assert.deepEqual(occupancyGaps(years), []);
  assert.equal(occupancyHeading("Whitaker house"), "Who lived at Whitaker house, year by year");
  assert.match(stayLine("Rose Whitaker", "1948-06-14", "1950-12-31"), /Rose Whitaker/);
  assert.equal(occupancyGapHeading("Whitaker house", 2), "2 empty years at Whitaker house");
});

test("city-directory, draft paper, class list, and I-was-there lines read like a relative wrote them", () => {
  assert.equal(directoryHeading("Cedar Falls", 1950), "Cedar Falls, 1950");
  assert.equal(directoryLine({ name: "Hart, Samuel", occupation: "farmer", address: "North farm", year: 1950 }), "Hart, Samuel · farmer · North farm · 1950");
  assert.equal(normalizePaperKind("Pension record"), "pension");
  assert.equal(paperHeading("draft", "Louis Whitaker"), "Draft record · Louis Whitaker");
  assert.match(paperLine("draft", "Louis Whitaker", 1944), /1944/);
  assert.equal(classHeading("Cedar Falls High", 1945), "Cedar Falls High, class of 1945");
  assert.equal(classLine(["Rose Whitaker", "Louis Whitaker"]), "Rose Whitaker, Louis Whitaker");
  assert.equal(thereLine("Maya Park", "Hart reunion"), "Maya Park was there · Hart reunion");
  assert.match(thereHeading(1), /1 relative was there/);
  assert.equal(bannerHeading("Hart"), "Hart family banner");
  assert.match(assignedHeading("June Whitaker", 2), /2 things assigned/);
});

test("start-here stays three steps; progress also asks who was there", () => {
  const start = startSteps({ claimed: true, hasStory: true, hasPhoto: true });
  assert.equal(start.length, 3);
  assert.match(startHeading(start), /archive is yours/);
  const progress = progressSteps({ claimed: true, hasStory: true, hasPhoto: true, hasThere: false });
  assert.equal(progress.length, 4);
  assert.equal(remainingSteps(progress)[0]?.id, "there");
  assert.match(progressHeading(progress), /mark an event you were at/i);
  const done = progressSteps({ claimed: true, hasStory: true, hasPhoto: true, hasThere: true });
  assert.equal(progressHeading(done), "Nothing left on the start list");
});

test("later extras name who is missing a directory line, a classmate, or a paper", () => {
  const missing = missingDirectoryPeople(
    [{ id: "rose", displayName: "Rose" }, { id: "louis", displayName: "Louis" }],
    [{ personId: "rose" }],
  );
  assert.equal(missing[0]?.id, "louis");
  assert.match(missingDirectoryHeading(1), /1 person still needs/);
  const classes = classmatesOf("rose", [
    { id: "c1", pupils: [{ personId: "rose" }, { personId: "louis" }] },
  ]);
  assert.equal(classes[0]?.mates[0]?.personId, "louis");
  assert.match(classmatesHeading("Rose Whitaker", 1), /1 classmate/);
  const needed = papersNeeded(
    [{ id: "svc", personId: "louis" }],
    [{ personId: "rose", serviceId: null }],
  );
  assert.equal(needed.length, 1);
  assert.match(papersNeededHeading(1), /1 service still needs/);
  assert.equal(suggestThere([{ id: "a" }, { id: "b" }], ["a"])[0]?.id, "b");
  assert.match(thereSuggestHeading(2), /2 events/);
});
