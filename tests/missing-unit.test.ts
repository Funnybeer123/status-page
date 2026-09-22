import assert from "node:assert/strict";
import { test } from "node:test";
import { missingInformation } from "../src/lib/missing";

test("missing information lists people a relative would still ask about", () => {
  const rows = missingInformation({
    people: [
      { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", profileAssetId: "p1" },
      { id: "nora", displayName: "Nora Park" },
      { id: "gone", displayName: "Gone", deletedAt: "2026-01-01" },
    ],
    parentIds: new Set(["rose"]),
    photoIds: new Set(["rose"]),
    storyIds: new Set(["rose"]),
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.displayName, "Nora Park");
  assert.deepEqual(rows[0]?.kinds, ["parents", "dates", "photo", "story"]);
});
