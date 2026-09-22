"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BookmarkButton({ personId, bookmarked }: { personId: string; bookmarked: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(bookmarked);
  const [error, setError] = useState("");
  async function toggle() {
    const next = !on;
    const response = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, bookmarked: next }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not bookmark that person.");
      return;
    }
    setOn(next);
    router.refresh();
  }
  return (
    <div className="mt-3" data-testid="bookmark-person">
      <button type="button" onClick={toggle} className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm">
        {on ? "Remove bookmark" : "Bookmark this person"}
      </button>
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}

export function FollowButton({ personId, following }: { personId: string; following: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(following);
  const [error, setError] = useState("");
  async function toggle() {
    const next = !on;
    const response = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, following: next }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not follow that person.");
      return;
    }
    setOn(next);
    router.refresh();
  }
  return (
    <div className="mt-3" data-testid="follow-person">
      <button type="button" onClick={toggle} className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm">
        {on ? "Stop following" : "Follow this person"}
      </button>
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}

export function KeepOutToggle({
  kind,
  id,
  keepOut,
}: {
  kind: "story" | "letter" | "journal";
  id: string;
  keepOut: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(keepOut);
  const [error, setError] = useState("");
  async function toggle() {
    const next = !on;
    const response = await fetch("/api/keep-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, keepOut: next }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not change Ask.");
      return;
    }
    setOn(next);
    router.refresh();
  }
  return (
    <div className="mt-4" data-testid={`keep-out-${kind}`}>
      <button type="button" onClick={toggle} className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm">
        {on ? "Let Ask find this" : "Keep out of Ask"}
      </button>
      <p className="mt-2 font-sans text-sm text-gold" data-testid="keep-out-badge">
        {on ? "Kept out of Ask" : "Ask can find this"}
      </p>
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}

export function ResearcherInviteForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(data.get("email") || ""),
        expiresOn: String(data.get("expiresOn") || ""),
        purpose: "researcher",
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not invite that researcher.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="researcher-form">
      <input name="email" type="email" placeholder="researcher@example.org" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="expiresOn" type="date" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Invite a guest researcher
      </button>
    </form>
  );
}

export function RevokeShareButton({ token, revoked }: { token: string; revoked: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState(revoked);
  const [error, setError] = useState("");
  async function revoke() {
    const response = await fetch("/api/share", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, revoke: true }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not revoke that link.");
      return;
    }
    setDone(true);
    router.refresh();
  }
  return (
    <div data-testid="revoke-share">
      {done ? (
        <p className="font-sans text-sm text-gold">This share link no longer works</p>
      ) : (
        <button type="button" onClick={revoke} className="rounded-full border border-bark/20 px-3 py-1 font-sans text-sm">
          Revoke this link
        </button>
      )}
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}
