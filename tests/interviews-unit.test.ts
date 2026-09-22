import assert from "node:assert/strict";
import { test } from "node:test";
import { ELDER_QUESTIONS, interviewQuestion } from "../src/lib/interviews";
import { memberIdsForBranch, peopleInBranch, relationshipsInBranch } from "../src/lib/branches";

test("elder interview checklist has the questions a relative would ask", () => {
  assert.ok(ELDER_QUESTIONS.length >= 6);
  assert.match(ELDER_QUESTIONS.map((item) => item.question).join(" "), /meet the person you married/);
  assert.equal(interviewQuestion("meet")?.key, "meet");
  assert.equal(interviewQuestion("missing"), null);
});

test("a named branch keeps only its own people on the tree", () => {
  const branches = [
    {
      id: "cedar",
      members: [{ personId: "ellie" }, { personId: "sam" }],
    },
  ];
  const ids = memberIdsForBranch(branches, "cedar");
  assert.deepEqual(ids, ["ellie", "sam"]);
  const people = peopleInBranch(
    [{ id: "ellie" }, { id: "sam" }, { id: "wei" }],
    ids,
  );
  assert.deepEqual(people.map((person) => person.id), ["ellie", "sam"]);
  const rels = relationshipsInBranch(
    [
      { fromPersonId: "ellie", toPersonId: "sam" },
      { fromPersonId: "wei", toPersonId: "meg" },
    ],
    ids,
  );
  assert.equal(rels.length, 1);
  assert.equal(memberIdsForBranch(branches, null), null);
});
