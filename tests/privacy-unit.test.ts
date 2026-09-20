import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import { isLiving, redactPerson, shouldHideLivingFacts, hideResidenceForViewer } from "../src/lib/privacy";

test("living people are those without a death date", () => {
  assert.equal(isLiving({ deathDate: null }), true);
  assert.equal(isLiving({ deathDate: new Date("2015-06-03") }), false);
});

test("viewers lose birth dates and notes on living people; contributors do not", () => {
  const nora = { displayName: "Nora Park", birthDate: new Date("1983-01-30"), deathDate: null, notes: "14 Oak Street diary" };
  assert.equal(shouldHideLivingFacts(Role.viewer, nora), true);
  assert.equal(shouldHideLivingFacts(Role.contributor, nora), false);
  const redacted = redactPerson(nora, Role.viewer);
  assert.equal(redacted.birthDate, null);
  assert.equal(redacted.notes, null);
  const open = redactPerson(nora, Role.owner);
  assert.equal(open.notes, "14 Oak Street diary");
  assert.equal(hideResidenceForViewer(Role.viewer, nora), true);
  assert.equal(hideResidenceForViewer(Role.viewer, { deathDate: new Date("2015-01-01") }), false);
});
