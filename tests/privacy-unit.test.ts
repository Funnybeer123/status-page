import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import { isLiving, isLivingMinor, hideMinorDetails, hidePhotoFromAudience, hideAdultWithoutConsent, redactPerson, shouldHideLivingFacts, hideResidenceForViewer } from "../src/lib/privacy";

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

test("living minors are hidden from viewers and share links, not from contributors", () => {
  const child = { displayName: "Nora Chen", birthDate: new Date("2018-06-14"), deathDate: null };
  const adult = { displayName: "Lily Chen", birthDate: new Date("1984-07-21"), deathDate: null };
  const undated = { displayName: "A cousin", birthDate: null, deathDate: null };
  assert.equal(isLivingMinor(child, new Date("2026-09-22")), true);
  assert.equal(isLivingMinor(adult, new Date("2026-09-22")), false);
  assert.equal(isLivingMinor(undated), false);
  assert.equal(hideMinorDetails(Role.viewer, child), true);
  assert.equal(hideMinorDetails(Role.contributor, child), false);
  assert.equal(hideMinorDetails("share", child), true);
  assert.equal(hidePhotoFromAudience(Role.viewer, [adult, child]), true);
  assert.equal(hidePhotoFromAudience(Role.contributor, [adult, child]), false);
  assert.equal(hideAdultWithoutConsent("share", { ...adult, id: "lily" }, []), true);
  assert.equal(hidePhotoFromAudience("share", [{ ...adult, id: "lily" }], ["lily"]), false);
});
