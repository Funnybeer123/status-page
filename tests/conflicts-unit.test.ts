import assert from "node:assert/strict";
import { test } from "node:test";
import { findDateConflicts } from "../src/lib/conflicts";

test("two death dates on one person are a conflict", () => {
  const conflicts = findDateConflicts({
    people: [{ id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" }],
    events: [
      { id: "e1", personId: "rose", kind: "death", happenedOn: "2008-11-02", preferred: true },
      { id: "e2", personId: "rose", kind: "death", happenedOn: "2008-11-05", preferred: false },
    ],
  });
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0]?.kind, "death");
  assert.equal(conflicts[0]?.dates.length, 2);
  assert.ok(conflicts[0]?.dates.some((date) => date.preferred));
});
