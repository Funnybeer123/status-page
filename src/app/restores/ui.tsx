"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RestoreForm({ assets }: { assets: { id: string; title: string | null }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/restores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        originalId: data.get("originalId"),
        cleanedId: data.get("cleanedId"),
        notes: data.get("notes") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that restoration pair.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="restore-form">
      <input name="title" required placeholder="Hart picnic, cleaned" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="originalId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Original scan</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.title || "Untitled photograph"}
          </option>
        ))}
      </select>
      <select name="cleanedId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Cleaned copy</option>
        {assets.map((asset) => (
          <option key={`clean-${asset.id}`} value={asset.id}>
            {asset.title || "Untitled photograph"}
          </option>
        ))}
      </select>
      <input name="notes" placeholder="What was cleaned" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the restoration pair
      </button>
    </form>
  );
}
