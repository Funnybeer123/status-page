"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
export function FamiliesClient({
  memberships,
  invite,
}: {
  memberships: { id: string; name: string; role: string }[];
  invite: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [token, setToken] = useState(invite);
  const [inviteRole, setInviteRole] = useState("contributor");
  const [createdLink, setCreatedLink] = useState("");
  const [error, setError] = useState("");

  async function createFamily(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/families", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error);
    router.push("/tree");
    router.refresh();
  }

  async function acceptInvite(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error);
    router.push("/tree");
    router.refresh();
  }

  async function makeInvite() {
    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: inviteRole }),
    });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error);
    setCreatedLink(`${window.location.origin}${payload.path}`);
  }

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <section className="paper-card p-6">
        <h2 className="font-display text-2xl">Families you belong to</h2>
        <ul className="mt-4 space-y-3">
          {memberships.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 border-b border-bark/10 pb-3">
              <span>{item.name}</span>
              <span className="font-sans text-xs uppercase tracking-wide text-gold">{item.role}</span>
            </li>
          ))}
          {!memberships.length ? <li className="text-bark">None yet. Create one or accept an invite.</li> : null}
        </ul>
      </section>
      <section className="space-y-6">
        <form onSubmit={createFamily} className="paper-card space-y-3 p-6">
          <h2 className="font-display text-2xl">Create a family</h2>
          <input className="w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Family name" />
          <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
            Create
          </button>
        </form>
        <form onSubmit={acceptInvite} className="paper-card space-y-3 p-6">
          <h2 className="font-display text-2xl">Accept an invite</h2>
          <input className="w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Invite token" />
          <button className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm" type="submit">
            Join
          </button>
        </form>
        {memberships.length ? (
          <div className="paper-card space-y-3 p-6">
            <h2 className="font-display text-2xl">Invite a relative</h2>
            <select className="rounded-lg border border-bark/15 bg-paper px-3 py-2" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="contributor">Contributor</option>
              <option value="viewer">Viewer</option>
              <option value="owner">Owner</option>
            </select>
            <button type="button" onClick={makeInvite} className="block rounded-full border border-bark/20 px-4 py-2 font-sans text-sm">
              Create invite link
            </button>
            {createdLink ? <p className="break-all font-sans text-sm text-moss">{createdLink}</p> : null}
          </div>
        ) : null}
        {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      </section>
    </div>
  );
}
