"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MeForm({
  people,
  personId,
}: {
  people: { id: string; displayName: string }[];
  personId?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: data.get("personId") || null }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not claim that person.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="me-form">
      <select name="personId" defaultValue={personId || ""} className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">I am not on the tree yet</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        This is me
      </button>
    </form>
  );
}
