"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChapterForm({ personId }: { personId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId,
        kind: data.get("kind"),
        title: data.get("title"),
        startedOn: data.get("startedOn") || undefined,
        endedOn: data.get("endedOn") || undefined,
        notes: data.get("notes") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that chapter.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="chapter-form">
      <select name="kind" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="childhood">Childhood</option>
        <option value="work">Work years</option>
        <option value="later">Later years</option>
        <option value="custom">Another chapter</option>
      </select>
      <input name="title" required placeholder="The millinery years" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="startedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="endedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      <input name="notes" placeholder="What this chapter holds" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a chapter
      </button>
    </form>
  );
}
