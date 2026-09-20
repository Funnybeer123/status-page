import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiClient, uniqueEmail } from "./helpers/http";

const PASSWORD = "invite-test-99";

test("auth gates and multi-family invites stay tenant-scoped", async (t) => {
  const guest = new ApiClient();

  await t.test("signed-out visitors cannot open the tree or people API", async () => {
    const tree = await guest.html("/tree");
    assert.equal(tree.status, 307);
    assert.match(tree.response.headers.get("location") || "", /\/login/);
    const people = await guest.json("/api/people");
    assert.equal(people.status, 401);
  });

  await t.test("wrong password does not create a session", async () => {
    const client = new ApiClient();
    const email = uniqueEmail("wrongpw");
    const signup = await client.signup({ name: "Pat", email, password: PASSWORD, familyName: "Pat family" });
    assert.equal(signup.status, 200, signup.body.error);
    const login = await client.signIn(email, "not-the-password");
    assert.ok(!login.session?.user, "wrong password must not create a session");
  });

  await t.test("duplicate signup is rejected", async () => {
    const client = new ApiClient();
    const email = uniqueEmail("dup");
    const first = await client.signup({ name: "One", email, password: PASSWORD, familyName: "Dup family" });
    assert.equal(first.status, 200, first.body.error);
    const second = await client.signup({ name: "Two", email, password: PASSWORD });
    assert.equal(second.status, 409);
  });

  const owner = new ApiClient();
  const ownerEmail = uniqueEmail("owner");
  await owner.signup({ name: "Owen Whitaker", email: ownerEmail, password: PASSWORD, familyName: "Invite family" });
  const ownerLogin = await owner.signIn(ownerEmail, PASSWORD);
  assert.ok(ownerLogin.session.user);

  const rose = await owner.json<{ person: { id: string } }>("/api/people", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "Secret Relative" }),
  });
  assert.equal(rose.status, 200, rose.body.error);

  await t.test("owner can invite a contributor who then sees the same tree", async () => {
    const invite = await owner.json<{ token: string; path: string }>("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "contributor" }),
    });
    assert.equal(invite.status, 200, invite.body.error);
    assert.ok(invite.body.token);

    const cousin = new ApiClient();
    const cousinEmail = uniqueEmail("cousin");
    const joined = await cousin.signup({
      name: "Chris Cousin",
      email: cousinEmail,
      password: PASSWORD,
      invite: invite.body.token,
    });
    assert.equal(joined.status, 200, joined.body.error);
    await cousin.signIn(cousinEmail, PASSWORD);
    const people = await cousin.json<{ people: { displayName: string }[] }>("/api/people");
    assert.equal(people.status, 200, people.body.error);
    assert.ok(people.body.people.some((person) => person.displayName === "Secret Relative"));
    const added = await cousin.json("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Cousin-added person" }),
    });
    assert.equal(added.status, 200, added.body.error);
  });

  await t.test("a viewer cannot write and a stranger cannot see the family", async () => {
    const invite = await owner.json<{ token: string }>("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "viewer" }),
    });
    assert.equal(invite.status, 200, invite.body.error);

    const viewer = new ApiClient();
    const viewerEmail = uniqueEmail("viewer");
    await viewer.signup({ name: "Vera Viewer", email: viewerEmail, password: PASSWORD, invite: invite.body.token });
    await viewer.signIn(viewerEmail, PASSWORD);
    const blocked = await viewer.json("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Should fail" }),
    });
    assert.equal(blocked.status, 403);

    const stranger = new ApiClient();
    const strangerEmail = uniqueEmail("stranger");
    await stranger.signup({ name: "Sam Stranger", email: strangerEmail, password: PASSWORD, familyName: "Other household" });
    await stranger.signIn(strangerEmail, PASSWORD);
    const people = await stranger.json<{ people: { displayName: string }[] }>("/api/people");
    assert.equal(people.status, 200);
    assert.ok(!people.body.people.some((person) => person.displayName === "Secret Relative"));
    const asked = await stranger.json<{ answer: string }>("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Who is Secret Relative?" }),
    });
    assert.doesNotMatch(asked.body.answer || "", /Secret Relative/);
  });

  await t.test("switching families isolates people and Ask", async () => {
    const created = await owner.json<{ family: { id: string; name: string } }>("/api/families", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Park cousins" }),
    });
    assert.equal(created.status, 200, created.body.error);
    const empty = await owner.json<{ people: { displayName: string }[] }>("/api/people");
    assert.ok(!empty.body.people.some((person) => person.displayName === "Secret Relative"));

    const note = await owner.json<{ document: { id: string } }>("/api/letters", {
      method: "POST",
      body: (() => {
        const form = new FormData();
        form.set("title", "Cousins picnic note");
        form.set("kind", "note");
        form.set("transcript", "The cousins met at the lake cabin, not at a millinery.");
        return form;
      })(),
    });
    assert.equal(note.status, 200, note.body.error);

    const list = await owner.json<{ memberships: { family: { id: string; name: string } }[] }>("/api/families");
    const inviteFamily = list.body.memberships.find((item) => item.family.name === "Invite family");
    assert.ok(inviteFamily);
    const switched = await owner.json("/api/families/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId: inviteFamily.family.id }),
    });
    assert.equal(switched.status, 200, switched.body.error);
    const back = await owner.json<{ people: { displayName: string }[] }>("/api/people");
    assert.ok(back.body.people.some((person) => person.displayName === "Secret Relative"));
    const tree = await owner.html("/tree");
    assert.match(tree.text, /Invite family/);
    assert.match(tree.text, /Secret Relative/);
  });
});
