import assert from "node:assert/strict";
import { test } from "node:test";
import { RelType } from "@prisma/client";
import { buildDescendants, countDescendants } from "../src/lib/descendants";
import { findSharedAncestors } from "../src/lib/sharedAncestors";
import { buildAhnentafel } from "../src/lib/ahnentafel";
import { ageAt } from "../src/lib/dates";

const people = [
  { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
  { id: "helen", displayName: "Helen Park", birthDate: "1954-09-22" },
  { id: "ned", displayName: "Ned Park", birthDate: "1956-04-01" },
  { id: "maya", displayName: "Maya Park", birthDate: "1983-01-30" },
];
const relationships = [
  { type: RelType.parent, fromPersonId: "rose", toPersonId: "helen" },
  { type: RelType.parent, fromPersonId: "rose", toPersonId: "ned" },
  { type: RelType.parent, fromPersonId: "helen", toPersonId: "maya" },
];

test("descendants walk children and grandchildren", () => {
  const tree = buildDescendants("rose", people, relationships);
  assert.ok(tree);
  assert.equal(countDescendants(tree), 3);
  assert.equal(tree!.children.length, 2);
});

test("Helen and Ned share Rose as an ancestor", () => {
  const shared = findSharedAncestors("helen", "ned", people, relationships);
  assert.equal(shared[0]?.id, "rose");
  assert.equal(shared[0]?.fromA, 1);
  assert.equal(shared[0]?.fromB, 1);
});

test("ahnentafel numbers Maya as 1 and Helen as a parent", () => {
  const rows = buildAhnentafel("maya", people, relationships);
  assert.equal(rows[0]?.person.id, "maya");
  assert.ok(rows.some((row) => row.number === 2 && row.person.id === "helen"));
});

test("age at an event uses whole years", () => {
  assert.equal(ageAt("1929-03-08", "1948-04-01"), 19);
  assert.equal(ageAt("1929-03-08", "1929-03-07"), null);
});
