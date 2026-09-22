import assert from "node:assert/strict";
import { test } from "node:test";
import { bookmarkHeading, bookmarkHomeHeading, bookmarkLine } from "../src/lib/bookmarks";
import { followFeedHeading, followHeading, followHref, followLine, followNoticeTitle } from "../src/lib/follows";
import { isShareRevoked, shareOpenLine, shareOpensHeading, shareRevokeHeading, shareLinksHeading } from "../src/lib/shareRevoke";
import { livingPeople, livingRelationships, livingTreeHeading, reunionLivingHeading, reunionLivingListHeading } from "../src/lib/livingTree";
import { keepOutBadge, keepOutHeading, keepOutLine, shouldSkipAsk } from "../src/lib/keepOut";
import { voyageRoute, voyageRouteHeading, voyageRouteLine } from "../src/lib/voyageRoute";
import { inviteExpired, parseExpiresOn, researcherInviteHeading, researcherInviteLine, researcherRole } from "../src/lib/researcherInvite";
import { lifePdfFilename, lifePdfTitle } from "../src/lib/lifePdf";
import { clippingHasPage, clippingPageHeading, clippingPageLine } from "../src/lib/clippingPage";
import { Role } from "@prisma/client";

test("bookmarks and follows read the way a relative would say them", () => {
  assert.equal(bookmarkHeading(0), "No bookmarked people yet");
  assert.equal(bookmarkHeading(1), "1 bookmarked person");
  assert.match(bookmarkHeading(3), /3 bookmarked people/);
  assert.equal(bookmarkLine(" Eleanor Hart "), "Eleanor Hart");
  assert.equal(bookmarkHomeHeading(1), "1 person on your bookmark list");
  assert.equal(followHeading(0), "You are not following anyone yet");
  assert.equal(followHeading(1), "Following 1 person");
  assert.equal(followLine("Eleanor Hart"), "Following Eleanor Hart");
  assert.equal(followNoticeTitle("story", "Eleanor Hart"), "A story was added about Eleanor Hart");
  assert.equal(followNoticeTitle("photo", "Wei Chen"), "A photograph was added about Wei Chen");
  assert.equal(followNoticeTitle("letter", "Samuel Hart"), "A letter was added about Samuel Hart");
  assert.equal(followHref("story", "s1"), "/stories/s1");
  assert.equal(followFeedHeading(0), "Nothing new about the people you follow");
});

test("a revoked share link stays dead and openings are named", () => {
  assert.equal(isShareRevoked({ revokedAt: null }), false);
  assert.equal(isShareRevoked({ revokedAt: new Date() }), true);
  assert.equal(shareRevokeHeading(true), "This share link no longer works");
  assert.equal(shareOpensHeading(0), "No one has opened this share link yet");
  assert.equal(shareOpensHeading(1), "1 person opened this share link");
  assert.equal(shareOpenLine({}), "Someone who was not signed in");
  assert.equal(shareOpenLine({ name: "Lily Chen", userAgent: "Mozilla" }), "Lily Chen · Mozilla");
  assert.equal(shareLinksHeading(1, 1), "1 open · 1 revoked");
});

test("the living-only tree drops anyone who has died", () => {
  const people = [
    { id: "rose", deathDate: "2008-11-02", deletedAt: null },
    { id: "maya", deathDate: null, deletedAt: null },
  ];
  const living = livingPeople(people);
  assert.equal(living.length, 1);
  assert.equal(living[0]?.id, "maya");
  const rels = livingRelationships(people, [
    { fromPersonId: "rose", toPersonId: "maya" },
    { fromPersonId: "maya", toPersonId: "june" },
  ]);
  assert.equal(rels.length, 0);
  assert.equal(livingTreeHeading(2), "2 living relatives on the tree");
  assert.match(reunionLivingHeading("Hart reunion", 3), /3 living relatives for Hart reunion/);
  assert.equal(reunionLivingListHeading(1), "1 living guest");
});

test("keep out of Ask, a life PDF, a voyage route, a researcher date, and a newspaper page", () => {
  assert.equal(shouldSkipAsk({ keepOutOfAsk: true }), true);
  assert.equal(shouldSkipAsk({ keepOutOfAsk: false }), false);
  assert.equal(keepOutHeading(0), "Ask can read every story, letter, and journal");
  assert.equal(keepOutHeading(1), "1 item is kept out of Ask");
  assert.equal(keepOutLine("Cider", true), "Cider · kept out of Ask");
  assert.equal(keepOutBadge(false), "Ask can find this");
  assert.equal(lifePdfTitle("Eleanor Hart"), "Eleanor Hart’s life");
  assert.equal(lifePdfFilename("Eleanor Hart"), "eleanor-hart-life.pdf");
  const route = voyageRoute({ departedFrom: "Hong Kong", arrivedAt: "San Francisco" });
  assert.ok(route);
  assert.equal(route?.label, "Hong Kong to San Francisco");
  assert.ok((route?.from.longitude ?? 0) > 0);
  assert.ok((route?.to.longitude ?? 0) < 0);
  assert.match(voyageRouteHeading("SS Eastern Star", "Hong Kong", "San Francisco"), /Hong Kong to San Francisco/);
  assert.equal(voyageRouteLine("Hong Kong", "San Francisco"), "Hong Kong → San Francisco");
  assert.equal(researcherRole("researcher", Role.owner), Role.viewer);
  assert.equal(researcherRole("member", Role.contributor), Role.contributor);
  const expires = parseExpiresOn("2026-12-31");
  assert.equal(expires.toISOString().slice(0, 10), "2026-12-31");
  assert.equal(inviteExpired("2000-01-01"), true);
  assert.equal(researcherInviteHeading(1), "1 guest-researcher invite");
  assert.match(researcherInviteLine("archives@cedarfalls.lib", "2026-12-31"), /expires 2026-12-31/);
  assert.equal(clippingPageHeading("Fairview burial notice"), "Newspaper page · Fairview burial notice");
  assert.equal(clippingPageLine(""), "The newspaper page");
  assert.equal(clippingHasPage({ assetId: "a" }), true);
});
