"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OwnerNoteForm({ personId, ownerNote }: { personId: string; ownerNote: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/people/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerNote: data.get("ownerNote") }),
    });
    if (response.ok) {
      setSaved("Saved.");
      router.refresh();
    }
  }
  return (
    <form onSubmit={onSubmit} className="paper-card grid gap-3 p-5" data-testid="owner-note-form">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Owner-only note</p>
      <textarea
        name="ownerNote"
        defaultValue={ownerNote}
        rows={3}
        placeholder="A note only the family owner can see"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
        data-testid="owner-note-input"
      />
      <div className="flex items-center gap-3">
        <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          Save the private note
        </button>
        <span className="font-sans text-sm text-moss">{saved}</span>
      </div>
    </form>
  );
}
