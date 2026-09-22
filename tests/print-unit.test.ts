import assert from "node:assert/strict";
import { test } from "node:test";
import { compileGroupSheet, listCouples } from "../src/lib/groupSheet";
import { compileDescendantReport } from "../src/lib/descendantReport";
import { mentionNames } from "../src/lib/mentions";
import { compileMarriageAges } from "../src/lib/marriageAges";
import { compileFamilyFirsts } from "../src/lib/familyFirsts";

const people = [
  { id: "rose", displayName: "Rose Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02" },
  { id: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14" },
  { id: "helen", displayName: "Helen Park", birthDate: "1954-09-22", deathDate: null },
  { id: "nora", displayName: "Nora Park", birthDate: "1981-04-03", deathDate: null },
];
const relationships = [
  { type: "partner", fromPersonId: "rose", toPersonId: "louis" },
  { type: "parent", fromPersonId: "rose", toPersonId: "helen" },
  { type: "parent", fromPersonId: "louis", toPersonId: "helen" },
  { type: "parent", fromPersonId: "helen", toPersonId: "nora" },
];

test("a group sheet lists parents, spouses, and children on one page", () => {
  const sheet = compileGroupSheet("rose", people, relationships, [
    { personId: "rose", otherPersonId: "louis", kind: "marriage", happenedOn: "1953-05-01", place: { name: "St. John's" } },
  ]);
  assert.ok(sheet);
  assert.equal(sheet.spouses[0]?.displayName, "Louis Whitaker");
  assert.ok(sheet.children.some((child) => child.person.displayName === "Helen Park"));
  assert.match(sheet.marriage?.date || "", /1953/);
  const couples = listCouples(people, relationships);
  assert.ok(couples.some((couple) => /Rose Whitaker and Louis Whitaker/.test(couple.names)));
});

test("a descendant report walks children and grandchildren with spouses", () => {
  const lines = compileDescendantReport("rose", people, relationships);
  assert.equal(lines[0]?.name, "Rose Whitaker");
  assert.ok(lines.some((line) => line.name === "Helen Park" && line.generation === 1));
  assert.ok(lines.some((line) => line.name === "Nora Park" && line.generation === 2));
  assert.match(lines.find((line) => line.id === "rose")?.spouses || "", /Louis Whitaker/);
});

test("mention names pick up a relative’s first or full name", () => {
  assert.deepEqual(mentionNames("Look at this, @Ned"), ["Ned"]);
  assert.deepEqual(mentionNames("@Ned Park, the millinery letter is in the chest."), ["Ned Park"]);
  assert.equal(mentionNames("No one tagged here").length, 0);
});

test("age at marriage uses the wedding day and a birth date", () => {
  const rows = compileMarriageAges(people, relationships, [
    { personId: "rose", otherPersonId: "louis", kind: "marriage", happenedOn: "1953-05-01" },
  ]);
  const rose = rows.find((row) => row.personId === "rose");
  assert.equal(rose?.spouseName, "Louis Whitaker");
  assert.equal(rose?.age, 24);
});

test("family firsts name the earliest birth, wedding, letter, and photograph", () => {
  const firsts = compileFamilyFirsts({
    people,
    relationships,
    events: [{ id: "m1", kind: "marriage", title: "Rose and Louis", personId: "rose", happenedOn: "1953-05-01" }],
    letters: [{ id: "l1", title: "June to Helen", writtenAt: "1952-06-14" }],
    photos: [{ id: "p1", title: "Market Street counter", capturedAt: "1952-06-14" }],
  });
  assert.ok(firsts.some((item) => item.title === "Earliest birth on the tree" && item.name === "Louis Whitaker"));
  assert.ok(firsts.some((item) => item.title === "First dated wedding" && /1953/.test(item.when)));
  assert.ok(firsts.some((item) => item.title === "Earliest letter" && item.name === "June to Helen"));
  assert.ok(firsts.some((item) => item.title === "Earliest photograph"));
});
