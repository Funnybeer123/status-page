"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StoryForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const personIds = data.getAll("personIds").map(String);
    const response = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        body: data.get("body"),
        recordedAt: data.get("recordedAt"),
        tellerPersonId: data.get("tellerPersonId") || undefined,
        personIds,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error);
      return;
    }
    router.push(`/stories/${payload.story.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-4 p-6">
      <input name="title" required placeholder="Title the family uses" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea name="body" required rows={8} placeholder="Write it the way it was told — oral notes welcome." className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="font-sans text-sm">
          Recorded
          <input type="date" name="recordedAt" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        </label>
        <label className="font-sans text-sm">
          Told by
          <select name="tellerPersonId" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2">
            <option value="">Unknown teller</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.displayName}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">People in the story</legend>
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
      <button disabled={busy} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        {busy ? "Saving…" : "Save story"}
      </button>
    </form>
  );
}
