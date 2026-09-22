import assert from "node:assert/strict";
import { test } from "node:test";
import { RelType } from "@prisma/client";
import { childMarks, halfSiblingsOf, isParentRel, siblingKind } from "../src/lib/rels";
import { howRelated } from "../src/lib/related";

const relationships = [
  { fromPersonId: "rose", toPersonId: "helen", type: RelType.parent },
  { fromPersonId: "louis", toPersonId: "helen", type: RelType.parent },
  { fromPersonId: "rose", toPersonId: "ned", type: RelType.parent },
  { fromPersonId: "robert", toPersonId: "daniel", type: RelType.parent },
  { fromPersonId: "robert", toPersonId: "claire", type: RelType.parent },
  { fromPersonId: "robert", toPersonId: "peter", type: RelType.adoptive },
  { fromPersonId: "helen-rowe", toPersonId: "daniel", type: RelType.step },
];

test("adoptive and step count as parent-like links", () => {
  assert.equal(isParentRel(RelType.adoptive), true);
  assert.equal(isParentRel(RelType.step), true);
  assert.deepEqual(childMarks("peter", relationships), ["adopted"]);
  assert.deepEqual(childMarks("daniel", relationships), ["step"]);
});

test("half siblings share exactly one parent", () => {
  assert.equal(siblingKind("helen", "ned", relationships), "half");
  assert.equal(siblingKind("daniel", "claire", relationships), "half");
  const half = halfSiblingsOf("daniel", [{ id: "claire", displayName: "Claire Hart" }], relationships);
  assert.equal(half[0]?.displayName, "Claire Hart");
});

test("howRelated names a half-sibling", () => {
  const people = [
    { id: "daniel", displayName: "Daniel Hart" },
    { id: "claire", displayName: "Claire Hart" },
    { id: "robert", displayName: "Robert Hart" },
  ];
  const result = howRelated(people, relationships, "daniel", "claire");
  assert.equal(result.found, true);
  assert.equal(result.relation, "half-sibling");
});
