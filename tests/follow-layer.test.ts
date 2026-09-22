import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";
import { makePhotoSvg } from "./helpers/fixtures";

const PASSWORD = "millinery-1952";

test("a relative can bookmark, follow, revoke a share, and keep a story out of Ask", async (t) => {
  const maya = new ApiClient();
  const email = uniqueEmail("follow-maya");
  const signup = await maya.signup({
    name: "Maya Park",
    email,
    password: PASSWORD,
    familyName: "Whitaker follow",
  });
  assert.equal(signup.status, 200, signup.body.error);
  await maya.signIn(email, PASSWORD);

  const viewInvite = await maya.json<{ token: string }>("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "viewer" }),
  });
  const viewer = new ApiClient();
  const viewerEmail = uniqueEmail("follow-viewer");
  await viewer.signup({ name: "Aunt June", email: viewerEmail, password: PASSWORD, invite: viewInvite.body.token });
  await viewer.signIn(viewerEmail, PASSWORD);

  const ids: Record<string, string> = {};

  await t.test("people, a voyage, a reunion, and a newspaper page entered the way a relative would", async () => {
    for (const person of [
      { key: "rose", displayName: "Rose Whitaker", givenName: "Rose", familyName: "Whitaker", birthDate: "1929-03-08", deathDate: "2008-11-02", sex: "F" },
      { key: "louis", displayName: "Louis Whitaker", birthDate: "1926-11-02", deathDate: "2011-01-14", sex: "M" },
      { key: "maya", displayName: "Maya Park", givenName: "Maya", familyName: "Park", birthDate: "1983-01-30" },
      { key: "june", displayName: "June Whitaker", birthDate: "1956-04-01" },
    ]) {
      const created = await maya.json<{ person: { id: string } }>("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      assert.equal(created.status, 200, created.body.error);
      ids[person.key] = created.body.person.id;
    }
    const voyage = await maya.json<{ voyage: { id: string } }>("/api/voyages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ship: "SS Eastern Star",
        departedFrom: "Hong Kong",
        arrivedAt: "San Francisco",
        departedOn: "1972-03-04",
        personIds: [ids.louis],
      }),
    });
    assert.equal(voyage.status, 200, voyage.body.error);
    ids.voyage = voyage.body.voyage.id;
    const reunion = await maya.json<{ reunion: { id: string } }>("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Whitaker reunion at the north farm",
        place: "Cedar Falls",
        happenedOn: "2026-07-04",
        personIds: [ids.maya, ids.june],
      }),
    });
    assert.equal(reunion.status, 200, reunion.body.error);
    ids.reunion = reunion.body.reunion.id;
    const page = new FormData();
    page.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "fairview.svg");
    page.set("title", "Fairview burial notice");
    page.set("transcript", "Rose Whitaker was named in the Courier on the Fairview page.");
    page.set("writtenAt", "2008-11-04");
    page.set("personIds", ids.rose);
    const clipping = await maya.json<{ document: { id: string } }>("/api/clippings", { method: "POST", body: page });
    assert.equal(clipping.status, 200, clipping.body.error);
    ids.clipping = clipping.body.document.id;
  });

  await t.test("bookmarking a person shows them on the family home", async () => {
    const saved = await maya.json<{ bookmarked: boolean }>("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose }),
    });
    assert.equal(saved.status, 200, saved.body.error);
    assert.equal(saved.body.bookmarked, true);
    const list = await maya.json<{ heading: string; lines: string[] }>("/api/bookmarks");
    assert.match(list.body.heading, /1 bookmarked person/);
    assert.ok(list.body.lines.includes("Rose Whitaker"));
    const home = await maya.html("/");
    assert.match(home.text, /1 person on your bookmark list|Rose Whitaker/);
    assert.match(home.text, /home-bookmarks|Rose Whitaker/);
    const page = await maya.html("/bookmarks");
    assert.match(page.text, /Rose Whitaker/);
  });

  await t.test("following a person sends a notice when a story, photo, or letter is added about them", async () => {
    const follow = await viewer.json<{ following: boolean }>("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: ids.rose }),
    });
    assert.equal(follow.status, 200, follow.body.error);
    assert.equal(follow.body.following, true);
    const story = await maya.json<{ story: { id: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "The millinery hatband Rose kept",
        body: "Rose kept the navy hatband in the cedar drawer after the harvest dance.",
        personIds: [ids.rose],
      }),
    });
    assert.equal(story.status, 200, story.body.error);
    ids.story = story.body.story.id;
    const letter = new FormData();
    letter.set("title", "June to Maya about Rose");
    letter.set("transcript", "I found Rose's hatband letter in the upstairs hall.");
    letter.set("personIds", ids.rose);
    const savedLetter = await maya.json<{ document: { id: string } }>("/api/letters", { method: "POST", body: letter });
    assert.equal(savedLetter.status, 200, savedLetter.body.error);
    const photo = new FormData();
    photo.set("file", new Blob([makePhotoSvg()], { type: "image/svg+xml" }), "rose.svg");
    photo.set("title", "Rose at the picnic");
    photo.set("personIds", ids.rose);
    const savedPhoto = await maya.json<{ asset: { id: string } }>("/api/assets", { method: "POST", body: photo });
    assert.equal(savedPhoto.status, 200, savedPhoto.body.error);
    const notices = await viewer.json<{ notifications: { title: string }[] }>("/api/notifications");
    const titles = notices.body.notifications.map((item) => item.title).join("\n");
    assert.match(titles, /A story was added about Rose Whitaker/);
    assert.match(titles, /A letter was added about Rose Whitaker/);
    assert.match(titles, /A photograph was added about Rose Whitaker/);
    const following = await viewer.html("/following");
    assert.match(following.text, /Following Rose Whitaker/);
  });

  await t.test("revoking a share link stops it, and openings are listed", async () => {
    const share = await maya.json<{ href: string; link: { id: string; token: string } }>("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "memorial", entityId: ids.rose }),
    });
    assert.equal(share.status, 200, share.body.error);
    ids.share = share.body.link.token;
    ids.shareId = share.body.link.id;
    const guest = new ApiClient();
    const opened = await guest.html(`/s/${ids.share}`);
    assert.equal(opened.status, 200);
    assert.match(opened.text, /Rose Whitaker/);
    const opens = await maya.json<{ heading: string; lines: string[] }>(`/api/share/opens?token=${ids.share}`);
    assert.equal(opens.status, 200, opens.body.error);
    assert.match(opens.body.heading, /1 person opened this share link/);
    assert.match(opens.body.lines.join("\n"), /Someone who was not signed in/);
    const page = await maya.html(`/shared/opens?token=${ids.share}`);
    assert.match(page.text, /Someone who was not signed in/);
    const blocked = await viewer.json("/api/share", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: ids.share, revoke: true }),
    });
    assert.equal(blocked.status, 403);
    const revoked = await maya.json<{ revoked: boolean }>("/api/share", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: ids.share, revoke: true }),
    });
    assert.equal(revoked.status, 200, revoked.body.error);
    assert.equal(revoked.body.revoked, true);
    const dead = await guest.html(`/s/${ids.share}`);
    assert.equal(dead.status, 404);
    const links = await maya.html("/shared/links");
    assert.match(links.text, /This share link no longer works/);
  });

  await t.test("a living-only tree for a reunion hides anyone who has died", async () => {
    const tree = await maya.html("/tree/living");
    assert.match(tree.text, /living relatives on the tree/);
    assert.match(tree.text, /Maya Park/);
    assert.match(tree.text, /June Whitaker/);
    assert.doesNotMatch(tree.text, /Rose Whitaker/);
    assert.doesNotMatch(tree.text, /Louis Whitaker/);
    const reunionTree = await maya.html(`/reunions/${ids.reunion}/tree`);
    assert.match(reunionTree.text, /living relatives for Whitaker reunion/);
    assert.match(reunionTree.text, /Maya Park · coming/);
    const namelist = await maya.html(`/reunions/${ids.reunion}/living`);
    assert.match(namelist.text, /2 living guests/);
    assert.match(namelist.text, /Maya Park/);
  });

  await t.test("keep out of Ask skips that story, letter, or journal", async () => {
    const secret = await maya.json<{ story: { id: string } }>("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "The hidden millinery recipe",
        body: "The secret millinery-hatband-recipe-1952 stayed in Rose's drawer.",
        personIds: [ids.rose],
      }),
    });
    assert.equal(secret.status, 200, secret.body.error);
    ids.secret = secret.body.story.id;
    const before = await maya.json<{ answer: string; sources: { title: string }[] }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Where is the millinery-hatband-recipe-1952?" }),
    });
    assert.match(before.body.answer + before.body.sources.map((item) => item.title).join(" "), /millinery-hatband-recipe-1952|hidden millinery recipe/i);
    const kept = await maya.json<{ keepOut: boolean; heading: string }>("/api/keep-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "story", id: ids.secret, keepOut: true }),
    });
    assert.equal(kept.status, 200, kept.body.error);
    assert.equal(kept.body.keepOut, true);
    const after = await maya.json<{ answer: string; sources: { title: string }[] }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Where is the millinery-hatband-recipe-1952?" }),
    });
    const blob = after.body.answer + after.body.sources.map((item) => item.title).join(" ");
    assert.doesNotMatch(blob, /hidden millinery recipe/i);
    const viewerBlocked = await viewer.json("/api/keep-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "story", id: ids.secret, keepOut: false }),
    });
    assert.equal(viewerBlocked.status, 403);
    const journal = await maya.json<{ entry: { id: string } }>("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Private cider note",
        body: "I still remember the cider-keepout-phrase-2026.",
        keepOut: true,
      }),
    });
    assert.equal(journal.status, 200, journal.body.error);
    await maya.json("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: journal.body.entry.id, share: true }),
    });
    const skipped = await maya.json<{ answer: string }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What is cider-keepout-phrase-2026?" }),
    });
    assert.doesNotMatch(skipped.body.answer, /cider-keepout-phrase-2026/);
    const keptOut = await maya.html("/ask/kept-out");
    assert.match(keptOut.text, /kept out of Ask/);
    assert.match(keptOut.text, /hidden millinery recipe|Private cider note/);
  });

  await t.test("a PDF of one person’s life downloads that life only", async () => {
    const pdf = await maya.request(`/api/people/${ids.rose}/life`);
    assert.equal(pdf.status, 200);
    const bytes = Buffer.from(await pdf.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    const text = bytes.toString("latin1");
    assert.match(text, /Rose Whitaker/);
    assert.doesNotMatch(text, /Maya Park/);
    const page = await maya.html(`/people/${ids.rose}/life`);
    assert.match(page.text, /Rose Whitaker’s life|Rose Whitaker/);
    assert.match(page.text, /Download/);
  });

  await t.test("a voyage route is drawn from the departure port to the arrival port", async () => {
    const map = await maya.html(`/map?voyageId=${ids.voyage}`);
    assert.match(map.text, /SS Eastern Star/);
    assert.match(map.text, /Hong Kong/);
    assert.match(map.text, /San Francisco/);
    assert.match(map.text, /voyage-route/);
    const list = await maya.html("/map/voyages");
    assert.match(list.text, /Hong Kong to San Francisco/);
  });

  await t.test("a guest-researcher invite expires on a date and joins as a viewer", async () => {
    const invite = await maya.json<{ token: string; role: string; purpose: string; expiresAt: string }>("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: uniqueEmail("researcher"),
        purpose: "researcher",
        expiresOn: "2027-12-31",
        role: "owner",
      }),
    });
    assert.equal(invite.status, 200, invite.body.error);
    assert.equal(invite.body.role, "viewer");
    assert.equal(invite.body.purpose, "researcher");
    assert.match(invite.body.expiresAt, /2027-12-31/);
    const researcher = new ApiClient();
    const researcherEmail = uniqueEmail("guest-researcher");
    await researcher.signup({
      name: "Guest Researcher",
      email: researcherEmail,
      password: PASSWORD,
      invite: invite.body.token,
    });
    await researcher.signIn(researcherEmail, PASSWORD);
    const people = await researcher.json<{ people?: { displayName: string }[] }>("/api/people");
    assert.equal(people.status, 200);
    const expired = await maya.json<{ token: string }>("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "researcher", expiresOn: "2001-01-01" }),
    });
    const lateIn = new ApiClient();
    const lateEmail = uniqueEmail("late-ok");
    await lateIn.signup({
      name: "Late Archive",
      email: lateEmail,
      password: PASSWORD,
      invite: expired.body.token,
    });
    await lateIn.signIn(lateEmail, PASSWORD);
    const noFamily = await lateIn.json("/api/people");
    assert.equal(noFamily.status, 400);
    const page = await maya.html("/invites/researcher");
    assert.match(page.text, /guest-researcher invite/);
    assert.match(page.text, /expires 2027-12-31/);
  });

  await t.test("who bookmarked and who follows a person is listed", async () => {
    const watchers = await maya.json<{ heading: string }>("/api/watchers?personId=" + ids.rose);
    assert.equal(watchers.status, 200, watchers.body.error);
    assert.match(watchers.body.heading, /bookmark/);
    const page = await maya.html(`/people/${ids.rose}/watchers`);
    assert.match(page.text, /Maya Park|Aunt June/);
    assert.match(page.text, /watchers-heading|bookmark/);
  });

  await t.test("the newspaper page image is shown on the clipping", async () => {
    const list = await maya.html("/clippings");
    assert.match(list.text, /Newspaper page · Fairview burial notice/);
    assert.match(list.text, /clipping-page/);
    const detail = await maya.html(`/letters/${ids.clipping}`);
    assert.match(detail.text, /Newspaper page · Fairview burial notice/);
  });
});
