"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PhoneTreeForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/phone-tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        phone: data.get("phone"),
        callOrder: Number(data.get("callOrder") || 1),
        notes: data.get("notes") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that number.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="phone-tree-form">
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who to call</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="phone" required placeholder="319-555-1947" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="callOrder" type="number" min={1} defaultValue={1} className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="After the harvest supper" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the phone tree
      </button>
    </form>
  );
}

export function PostmarkForm({
  letterId,
  stamp,
  when,
}: {
  letterId: string;
  stamp?: string | null;
  when?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/letters/${letterId}/postmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stampText: data.get("stampText"),
        postmarkedAt: data.get("postmarkedAt") || null,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that postmark.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="postmark-form">
      <input
        name="stampText"
        defaultValue={stamp || ""}
        placeholder="Cedar Falls, Iowa"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      <input
        name="postmarkedAt"
        type="date"
        defaultValue={when || ""}
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the postmark
      </button>
    </form>
  );
}

export function GuestBookForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: data.get("body") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not sign the guest book.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="guestbook-form">
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Lily Chen visited from Cedar Falls and left Sunday rolls."
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Sign the guest book
      </button>
    </form>
  );
}
