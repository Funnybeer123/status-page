import assert from "node:assert/strict";
import { test } from "node:test";
import { exportGedcom, fromGedcomDate, parseGedcom, toGedcomDate } from "../src/lib/gedcom";

test("GEDCOM dates round-trip", () => {
  assert.equal(toGedcomDate("1929-03-08"), "8 MAR 1929");
  assert.equal(fromGedcomDate("8 MAR 1929"), "1929-03-08");
});

test("parseGedcom reads people, a marriage, and a child", () => {
  const tree = parseGedcom(`0 HEAD
0 @I1@ INDI
1 NAME Rose /Whitaker/
1 SEX F
1 BIRT
2 DATE 8 MAR 1929
0 @I2@ INDI
1 NAME Louis /Whitaker/
1 SEX M
0 @I3@ INDI
1 NAME Helen /Park/
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I1@
1 MARR
2 DATE 1 MAY 1953
1 CHIL @I3@
0 TRLR
`);
  assert.equal(tree.people.length, 3);
  assert.equal(tree.people[0].displayName, "Rose Whitaker");
  assert.equal(tree.people[0].birthDate, "1929-03-08");
  assert.equal(tree.families[0].children[0], "I3");
  assert.equal(tree.families[0].marriedOn, "1953-05-01");
});

test("exportGedcom writes INDI and FAM records", () => {
  const text = exportGedcom({
    familyName: "Whitaker",
    people: [
      { id: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", sex: "F", birthDate: "1929-03-08" },
      { id: "louis", displayName: "Louis Whitaker", givenName: "Louis", familyName: "Whitaker", sex: "M" },
      { id: "helen", displayName: "Helen Park", givenName: "Helen", familyName: "Park" },
    ],
    relationships: [
      { type: "partner", fromPersonId: "rose", toPersonId: "louis", startedAt: "1953-05-01" },
      { type: "parent", fromPersonId: "rose", toPersonId: "helen" },
      { type: "parent", fromPersonId: "louis", toPersonId: "helen" },
    ],
  });
  assert.match(text, /0 @I1@ INDI/);
  assert.match(text, /1 NAME Rose \/Whitaker\//);
  assert.match(text, /1 MARR/);
  assert.match(text, /1 CHIL @I3@/);
  const again = parseGedcom(text);
  assert.equal(again.people.length, 3);
});
