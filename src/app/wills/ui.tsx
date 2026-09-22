"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WillForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/wills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        body: data.get("body"),
        writtenAt: data.get("writtenAt"),
        personIds: data.getAll("personIds"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that will.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="will-form">
      <input name="title" required placeholder="Samuel Hart’s will" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea name="body" required rows={5} placeholder="What the family still has in writing" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="writtenAt" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
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
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the will
      </button>
    </form>
  );
}
