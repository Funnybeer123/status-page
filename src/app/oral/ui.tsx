"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TranscribeForm({
  assetId,
  people,
}: {
  assetId: string;
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/oral/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        transcript: data.get("transcript"),
        title: data.get("title") || undefined,
        personId: data.get("personId") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that transcript.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3" data-testid="transcribe-form">
      <input name="title" placeholder="Helen on the millinery counter" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who is speaking</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <textarea name="transcript" required rows={4} placeholder="Write what you hear on the recording" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the transcript
      </button>
    </form>
  );
}
