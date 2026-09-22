"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Asset = { id: string; title: string };
type Place = { id: string; name: string };

export function PairForm({ assets, places = [] }: { assets: Asset[]; places?: Place[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/pairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        thenAssetId: data.get("thenAssetId"),
        nowAssetId: data.get("nowAssetId"),
        placeId: data.get("placeId") || undefined,
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not pair those photographs.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="pair-form">
      <input name="title" required placeholder="The Grange hall, then and now" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="thenAssetId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Then</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.title}</option>
        ))}
      </select>
      <select name="nowAssetId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Now</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.title}</option>
        ))}
      </select>
      {places.length ? (
        <select name="placeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Place on the map (optional)</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>{place.name}</option>
          ))}
        </select>
      ) : null}
      <input name="notes" placeholder="What changed" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Pair the photographs
      </button>
    </form>
  );
}
