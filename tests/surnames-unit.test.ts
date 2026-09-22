import assert from "node:assert/strict";
import { test } from "node:test";
import { groupSurnames } from "../src/lib/surnames";

test("maiden names and last names share a surname bucket", () => {
  const groups = groupSurnames([
    { id: "e", displayName: "Eleanor Hart", familyName: "Hart", names: [{ kind: "maiden", name: "Eleanor Whitaker" }] },
    { id: "s", displayName: "Samuel Hart", familyName: "Hart" },
    { id: "r", displayName: "Rose Whitaker", familyName: "Whitaker" },
  ]);
  const hart = groups.find((group) => group.surname === "Hart");
  const whitaker = groups.find((group) => group.surname === "Whitaker");
  assert.ok(hart);
  assert.equal(hart!.people.length, 2);
  assert.ok(whitaker);
  assert.ok(whitaker!.people.some((person) => person.displayName === "Eleanor Hart"));
  assert.ok(whitaker!.people.some((person) => person.displayName === "Rose Whitaker"));
});
