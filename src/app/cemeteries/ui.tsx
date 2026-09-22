"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = { id: string; displayName: string };

export function CemeteryForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/cemeteries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        locality: data.get("locality"),
        region: data.get("region"),
        country: data.get("country"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that cemetery.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="cemetery-form">
      <input name="name" required placeholder="Fairview Cemetery" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="locality" placeholder="Town" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="region" placeholder="County or state" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="country" placeholder="Country" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add the cemetery
      </button>
    </form>
  );
}

export function PlotForm({ cemeteryId, people }: { cemeteryId: string; people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/cemeteries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cemeteryId,
        personId: data.get("personId"),
        plot: data.get("plot"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that plot.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="plot-form">
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who is buried here</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="plot" placeholder="Lot 14, row 3" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a plot
      </button>
    </form>
  );
}
