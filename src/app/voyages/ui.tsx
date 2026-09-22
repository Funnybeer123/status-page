"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VoyageForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/voyages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ship: data.get("ship"),
        departedFrom: data.get("departedFrom"),
        arrivedAt: data.get("arrivedAt"),
        departedOn: data.get("departedOn"),
        arrivedOn: data.get("arrivedOn"),
        notes: data.get("notes"),
        personIds: data.getAll("personIds"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that voyage.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="voyage-form">
      <input name="ship" required placeholder="Ship name" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="departedFrom" required placeholder="Departure port" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="arrivedAt" required placeholder="Arrival port" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="departedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="arrivedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">Who sailed</legend>
        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <label key={person.id} className="rounded-full border border-bark/15 px-3 py-1">
              <input type="checkbox" name="personIds" value={person.id} className="mr-2" />
              {person.displayName}
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Record the voyage
      </button>
    </form>
  );
}
