"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ObituaryForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("personIds", data.getAll("personIds").map(String).join(","));
    const response = await fetch("/api/obituaries", { method: "POST", body: data });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error || "Could not save that obituary.");
      return;
    }
    router.push(`/letters/${payload.document.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="obituary-form">
      <input name="title" required placeholder="Headline" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="writtenAt" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input type="file" name="file" accept="image/*,application/pdf" className="font-sans text-sm" />
      <textarea name="transcript" rows={5} placeholder="What the paper said" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">Named</legend>
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
        {busy ? "Saving…" : "Save the obituary"}
      </button>
    </form>
  );
}
