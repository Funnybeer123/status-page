"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RecipeForm({
  people,
  holidays = [],
}: {
  people: { id: string; displayName: string }[];
  holidays?: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        body: data.get("body"),
        writtenAt: data.get("writtenAt"),
        personIds: data.getAll("personIds"),
        holidayId: data.get("holidayId") || undefined,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error || "Could not save that recipe.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="recipe-form">
      <input name="title" required placeholder="Rose’s Sunday rolls" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="writtenAt" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea name="body" required rows={6} placeholder="Flour, yeast, and the rest of what she said" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {holidays.length ? (
        <select name="holidayId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Holiday (optional)</option>
          {holidays.map((holiday) => (
            <option key={holiday.id} value={holiday.id}>
              {holiday.title}
            </option>
          ))}
        </select>
      ) : null}
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">Whose recipe</legend>
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
      <button disabled={busy} className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        {busy ? "Saving…" : "Add to the cookbook"}
      </button>
    </form>
  );
}
