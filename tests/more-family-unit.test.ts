import assert from "node:assert/strict";
import { test } from "node:test";
import { RelType } from "@prisma/client";
import { cousinsOf, directoryRows, groupByYear, livingPeople, longevityRows, photographedCounts, qualifyDate } from "../src/lib/moreFamily";
import { fanSlices } from "../src/lib/fan";
import { buildPedigree } from "../src/lib/pedigree";

test("longevity sorts the longest lives first", () => {
  const rows = longevityRows([
    { id: "rose", displayName: "Rose", birthDate: "1929-03-08", deathDate: "2008-11-02" },
    { id: "louis", displayName: "Louis", birthDate: "1926-11-02", deathDate: "2011-01-14" },
    { id: "helen", displayName: "Helen", birthDate: "1954-09-22" },
  ]);
  assert.equal(rows[0]?.displayName, "Louis");
  assert.ok((rows[0]?.years ?? 0) > (rows[1]?.years ?? 0));
});

test("cousins are the children of aunts and uncles", () => {
  const people = [
    { id: "rose", displayName: "Rose" },
    { id: "helen", displayName: "Helen" },
    { id: "ned", displayName: "Ned" },
    { id: "maya", displayName: "Maya" },
    { id: "daniel", displayName: "Daniel" },
  ];
  const relationships = [
    { fromPersonId: "rose", toPersonId: "helen", type: RelType.parent },
    { fromPersonId: "rose", toPersonId: "ned", type: RelType.parent },
    { fromPersonId: "helen", toPersonId: "maya", type: RelType.parent },
    { fromPersonId: "ned", toPersonId: "daniel", type: RelType.parent },
  ];
  const cousins = cousinsOf("maya", people, relationships);
  assert.equal(cousins[0]?.displayName, "Daniel");
  assert.equal(cousins[0]?.via, "Ned");
});

test("directory, living, photographs, and years group the way a relative would look", () => {
  const living = livingPeople([
    { id: "helen", displayName: "Helen", deathDate: null },
    { id: "rose", displayName: "Rose", deathDate: "2008-11-02" },
  ]);
  assert.equal(living.length, 1);
  const directory = directoryRows(
    [{ id: "helen", displayName: "Helen Park", familyName: "Park" }],
    [{ personId: "helen", userName: "Maya Park" }],
  );
  assert.equal(directory[0]?.claimedBy, "Maya Park");
  const photos = photographedCounts(
    [{ id: "rose", displayName: "Rose" }, { id: "helen", displayName: "Helen" }],
    [{ personId: "rose" }, { personId: "rose" }, { personId: "helen" }],
  );
  assert.equal(photos[0]?.displayName, "Rose");
  assert.equal(photos[0]?.photos, 2);
  const years = groupByYear([
    { id: "a", writtenAt: "1947-10-18" },
    { id: "b", writtenAt: "1948-06-14" },
    { id: "c", writtenAt: null },
  ]);
  assert.equal(years[0]?.[0], "1948");
  assert.equal(years[2]?.[0], "Undated");
  assert.equal(qualifyDate("2 June 2015", "circa"), "about 2 June 2015");
});

test("a fan chart lists the person and their parents", () => {
  const tree = buildPedigree(
    "maya",
    [
      { id: "maya", displayName: "Maya" },
      { id: "helen", displayName: "Helen" },
      { id: "rose", displayName: "Rose" },
    ],
    [
      { type: RelType.parent, fromPersonId: "helen", toPersonId: "maya" },
      { type: RelType.parent, fromPersonId: "rose", toPersonId: "helen" },
    ],
  );
  const slices = fanSlices(tree);
  assert.ok(slices.some((slice) => slice.name === "Maya" && slice.generation === 0));
  assert.ok(slices.some((slice) => slice.name === "Rose"));
});
