"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlaceMergeForm({
  places,
}: {
  places: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/places/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId: data.get("keepId"), dropId: data.get("dropId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not merge those places.");
      return;
    }
    router.refresh();
    router.push(`/places/${payload.place.id}`);
  }
  if (places.length < 2) return null;
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="place-merge-form">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Merge a duplicate place</p>
      <select name="keepId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        {places.map((place) => (
          <option key={place.id} value={place.id}>{place.name}</option>
        ))}
      </select>
      <select name="dropId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="place-merge-drop">
        {places.map((place) => (
          <option key={`drop-${place.id}`} value={place.id}>{place.name}</option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit" data-testid="place-merge-submit">
        Merge into the first place
      </button>
    </form>
  );
}
