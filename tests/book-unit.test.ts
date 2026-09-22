import assert from "node:assert/strict";
import { test } from "node:test";
import { compileNameIndex } from "../src/lib/book";

test("the printable book indexes a display name and a maiden name", () => {
  const index = compileNameIndex([
    { id: "p1", displayName: "Eleanor Hart", names: [{ name: "Eleanor Whitaker" }, { name: "Ellie" }] },
    { id: "p2", displayName: "Samuel Hart", names: [{ name: "Sam" }] },
  ]);
  assert.ok(index.some((entry) => entry.name === "Ellie" && entry.href === "#chapter-p1"));
  assert.ok(index.some((entry) => entry.name === "Eleanor Whitaker" && entry.chapter === "Eleanor Hart"));
  assert.ok(index.some((entry) => entry.name === "Sam" && entry.href === "#chapter-p2"));
  const names = index.map((entry) => entry.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});
