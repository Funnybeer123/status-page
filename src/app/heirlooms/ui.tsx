"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeirloomForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/heirlooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        summary: data.get("summary"),
        personId: data.get("personId") || undefined,
        acquiredAt: data.get("acquiredAt"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that heirloom.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="heirloom-form">
      <input name="title" required placeholder="The navy hatband" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea name="summary" rows={3} placeholder="Where it lives now" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Whose it was</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>{person.displayName}</option>
          ))}
        </select>
        <input name="acquiredAt" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the object
      </button>
    </form>
  );
}
