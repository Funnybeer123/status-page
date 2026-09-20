import assert from "node:assert/strict";
import { test } from "node:test";
import { RelType } from "@prisma/client";
import { howRelated, relationFromLabels } from "../src/lib/related";

const people = [
  { id: "rose", displayName: "Rose Whitaker" },
  { id: "louis", displayName: "Louis Whitaker" },
  { id: "helen", displayName: "Helen Park" },
  { id: "nora", displayName: "Nora Park" },
  { id: "ben", displayName: "Ben Park" },
];

const relationships = [
  { fromPersonId: "rose", toPersonId: "louis", type: RelType.partner },
  { fromPersonId: "rose", toPersonId: "helen", type: RelType.parent },
  { fromPersonId: "louis", toPersonId: "helen", type: RelType.parent },
  { fromPersonId: "helen", toPersonId: "nora", type: RelType.parent },
  { fromPersonId: "helen", toPersonId: "ben", type: RelType.parent },
];

test("relation labels cover parent, grandchild, sibling, and cousin-style hops", () => {
  assert.equal(relationFromLabels(["child of", "child of"]), "grandchild");
  assert.equal(relationFromLabels(["child of", "parent of"]), "sibling");
  assert.equal(relationFromLabels(["child of", "child of", "parent of", "parent of"]), "first cousin");
});

test("howRelated walks the Whitaker tree the way a relative would", () => {
  const noraRose = howRelated(people, relationships, "nora", "rose");
  assert.equal(noraRose.found, true);
  assert.equal(noraRose.relation, "grandchild");
  assert.match(noraRose.sentence, /Nora Park is the grandchild of Rose Whitaker/);
  assert.equal(noraRose.steps.length, 2);

  const noraLouis = howRelated(people, relationships, "nora", "louis");
  assert.equal(noraLouis.relation, "grandchild");

  const noraBen = howRelated(people, relationships, "nora", "ben");
  assert.equal(noraBen.relation, "sibling");

  const roseLouis = howRelated(people, relationships, "rose", "louis");
  assert.equal(roseLouis.relation, "partner");

  const same = howRelated(people, relationships, "nora", "nora");
  assert.equal(same.relation, "the same person");

  const none = howRelated(people, [], "nora", "rose");
  assert.equal(none.found, false);
});
