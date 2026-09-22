import assert from "node:assert/strict";
import { test } from "node:test";
import { expandAskQuery, isFollowUp, isMeetingQuestion, tokenize } from "../src/lib/ask";

test("tokenize maps meet/met and grandma/grandpa aliases", () => {
  const tokens = tokenize("How did grandma meet grandpa?");
  assert.ok(tokens.includes("grandmother"));
  assert.ok(tokens.includes("grandfather"));
  assert.ok(tokens.includes("meet"));
});

test("tokenize treats met as meet so uploaded letters match Ask", () => {
  const tokens = tokenize("Grandma Rose met Grandpa Louis at the millinery counter");
  assert.ok(tokens.includes("meet"));
  assert.ok(tokens.includes("grandmother"));
  assert.ok(tokens.includes("grandfather"));
  assert.ok(tokens.includes("millinery"));
});

test("isMeetingQuestion recognizes the grandchild question", () => {
  assert.equal(isMeetingQuestion("How did grandma meet grandpa?"), true);
  assert.equal(isMeetingQuestion("What did they eat at Christmas?"), false);
});

test("a short follow-up with a pronoun stays in the same conversation", () => {
  assert.equal(isFollowUp("What did she say about the cider?"), true);
  assert.equal(isFollowUp("How did grandma meet grandpa?"), false);
  assert.equal(
    expandAskQuery("What did she say about the cider?", [
      { role: "user", text: "How did grandma meet grandpa?" },
      { role: "assistant", text: "They met at the harvest dance." },
    ]),
    "How did grandma meet grandpa? What did she say about the cider?",
  );
});
