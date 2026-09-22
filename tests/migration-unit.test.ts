import assert from "node:assert/strict";
import { test } from "node:test";
import { mappedStops, migrationPath } from "../src/lib/migration";

test("migration path orders the towns a person lived in", () => {
  const path = migrationPath([
    {
      id: "2",
      startedAt: "1948-06-14",
      endedAt: "2015-06-03",
      place: { id: "farm", name: "North farm", latitude: 42.54, longitude: -92.452 },
    },
    {
      id: "1",
      startedAt: "1928-03-12",
      endedAt: "1948-06-14",
      place: { id: "cedar", name: "Cedar Falls", latitude: 42.5278, longitude: -92.4453 },
    },
  ]);
  assert.equal(path[0]?.name, "Cedar Falls");
  assert.equal(path[1]?.name, "North farm");
  assert.equal(mappedStops(path).length, 2);
});
