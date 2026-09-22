"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SchoolForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        school: data.get("school"),
        place: data.get("place"),
        startedOn: data.get("startedOn"),
        endedOn: data.get("endedOn"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that school.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="school-form">
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who attended</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="school" required placeholder="Cedar Falls High" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" placeholder="Place" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="startedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="endedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add the school
      </button>
    </form>
  );
}
