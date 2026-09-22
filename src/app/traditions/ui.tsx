"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TraditionForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/traditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        summary: data.get("summary"),
        season: data.get("season"),
        personId: data.get("personId") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that tradition.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="tradition-form">
      <input name="title" required placeholder="Sunday rolls after church" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea name="summary" rows={3} placeholder="How the family still keeps it" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="season" placeholder="Harvest, Easter, Sundays" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Who kept it</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>{person.displayName}</option>
          ))}
        </select>
      </div>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the tradition
      </button>
    </form>
  );
}
