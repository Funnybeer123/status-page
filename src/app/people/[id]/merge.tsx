"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MergeForm({
  keepId,
  people,
}: {
  keepId: string;
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const others = people.filter((person) => person.id !== keepId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/people/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId, dropId: data.get("dropId") }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error || "Could not merge those people.");
      return;
    }
    router.refresh();
    router.push(`/people/${payload.person.id}`);
  }

  if (!others.length) return null;

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="merge-form">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Merge a duplicate</p>
      <p className="text-bark">Fold another record into this one. Letters, photos, and links move over.</p>
      <select name="dropId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="merge-drop">
        {others.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button disabled={busy} className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit" data-testid="merge-submit">
        {busy ? "Merging…" : "Merge into this person"}
      </button>
    </form>
  );
}
