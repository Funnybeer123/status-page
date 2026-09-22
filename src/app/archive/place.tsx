"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PhotoPlaceForm({
  assetId,
  places,
}: {
  assetId: string;
  places: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/photos/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        placeId: data.get("placeId") || undefined,
        name: data.get("name") || undefined,
        locality: data.get("locality") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not mark that place.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="photo-place-form">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Where this was taken</p>
      <select name="placeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A place already on the map</option>
        {places.map((place) => (
          <option key={place.id} value={place.id}>{place.name}</option>
        ))}
      </select>
      <input name="name" placeholder="Or a new place name" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="locality" placeholder="Town" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Mark the place
      </button>
    </form>
  );
}
