"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FilmMomentForm({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/films/moments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        seconds: data.get("seconds"),
        title: data.get("title"),
        notes: data.get("notes") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not mark that moment.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="film-moment-form">
      <input name="seconds" required placeholder="1:23 or seconds" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="title" required placeholder="Mother cuts the Sunday rolls" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="What happens here" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Mark the moment
      </button>
    </form>
  );
}
