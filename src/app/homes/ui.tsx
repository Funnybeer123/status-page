"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomeAddForm({
  homeId,
  people,
  assets,
}: {
  homeId: string;
  people: { id: string; displayName: string }[];
  assets: { id: string; title: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeId,
        assetId: data.get("assetId") || undefined,
        personId: data.get("personId") || undefined,
        takenOn: data.get("takenOn") || undefined,
        caption: data.get("caption") || undefined,
        startedOn: data.get("startedOn") || undefined,
        endedOn: data.get("endedOn") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="home-add">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Add a resident or photograph</p>
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who lived here</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="startedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="endedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      <select name="assetId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A photograph of the house</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.title || "Untitled"}</option>
        ))}
      </select>
      <input name="takenOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="caption" placeholder="Caption" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">Add to the house</button>
    </form>
  );
}
