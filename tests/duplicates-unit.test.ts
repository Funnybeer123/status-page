import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreDuplicate, suggestDuplicates } from "../src/lib/duplicates";

test("Rose Whitaker and Rose W. look like the same person", () => {
  const { score, reasons } = scoreDuplicate(
    { id: "1", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08" },
    { id: "2", displayName: "Rose W.", givenName: "Rose", birthDate: "1929-03-08" },
  );
  assert.ok(score >= 55, String(score));
  assert.ok(reasons.some((reason) => /name|birth/i.test(reason)));
});

test("suggestDuplicates keeps the longer name", () => {
  const pairs = suggestDuplicates([
    { id: "short", displayName: "Rose W.", birthDate: "1929-03-08" },
    { id: "long", displayName: "Rose Whitaker", familyName: "Whitaker", birthDate: "1929-03-08" },
    { id: "other", displayName: "Louis Whitaker", birthDate: "1926-11-02" },
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].keepName, "Rose Whitaker");
  assert.equal(pairs[0].dropName, "Rose W.");
});

test("different birth years are not suggested", () => {
  const pairs = suggestDuplicates([
    { id: "a", displayName: "Helen Park", birthDate: "1954-09-22" },
    { id: "b", displayName: "Helen Park", birthDate: "1983-01-30" },
  ]);
  assert.equal(pairs.length, 0);
});
