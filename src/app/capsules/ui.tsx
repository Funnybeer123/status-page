"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = { id: string; displayName: string };

export function CapsuleForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/capsules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        body: data.get("body"),
        writtenAt: data.get("writtenAt"),
        openOn: data.get("openOn"),
        addresseeName: data.get("addresseeName"),
        addresseePersonId: data.get("addresseePersonId") || undefined,
        fromPersonId: data.get("fromPersonId") || undefined,
        personIds: data.getAll("personIds"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that letter.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="capsule-form">
      <input name="title" required placeholder="A letter for a child not yet grown" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="addresseeName" required placeholder="Addressed to" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="capsule-addressee" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="font-sans text-sm text-bark">
          Written
          <input name="writtenAt" type="date" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        </label>
        <label className="font-sans text-sm text-bark">
          Open on
          <input name="openOn" type="date" required className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="capsule-open-on" />
        </label>
      </div>
      <select name="fromPersonId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">From (optional)</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="addresseePersonId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Named relative on the tree (optional)</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <textarea name="body" required rows={8} placeholder="What they should still hear" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">Also link</legend>
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
        Seal the capsule
      </button>
    </form>
  );
}
