import assert from "node:assert/strict";
import { test } from "node:test";
import { RelType } from "@prisma/client";
import { buildPedigree, flattenPedigree } from "../src/lib/pedigree";

test("buildPedigree walks parents and grandparents", () => {
  const tree = buildPedigree(
    "nora",
    [
      { id: "rose", displayName: "Rose" },
      { id: "louis", displayName: "Louis" },
      { id: "helen", displayName: "Helen" },
      { id: "nora", displayName: "Nora" },
    ],
    [
      { type: RelType.parent, fromPersonId: "rose", toPersonId: "helen" },
      { type: RelType.parent, fromPersonId: "louis", toPersonId: "helen" },
      { type: RelType.parent, fromPersonId: "helen", toPersonId: "nora" },
    ],
  );
  assert.ok(tree);
  assert.equal(tree?.person.displayName, "Nora");
  assert.equal(tree?.parents[0]?.person.displayName, "Helen");
  const rows = flattenPedigree(tree);
  assert.equal(rows[0][1][0].displayName, "Nora");
  assert.ok(rows.some(([, people]) => people.some((person) => person.displayName === "Rose")));
});
