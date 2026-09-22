"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BranchForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        summary: data.get("summary"),
        personIds: data.getAll("personIds"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not name that branch.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="branch-form">
      <input name="name" required placeholder="the Cedar Falls Harts" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="summary" placeholder="Who this branch is" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">On this branch</legend>
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
        Name the branch
      </button>
    </form>
  );
}
