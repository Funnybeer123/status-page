"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FamilyLinksForm({
  personId,
  people,
  partners,
}: {
  personId: string;
  people: { id: string; displayName: string }[];
  partners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function addRel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const type = String(data.get("type"));
    const otherId = String(data.get("otherId"));
    const body =
      type === "partner"
        ? { fromPersonId: personId, toPersonId: otherId, type }
        : { fromPersonId: otherId, toPersonId: personId, type };
    const response = await fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that link.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  async function endRel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/relationships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: data.get("id"),
        endedAt: data.get("endedAt"),
        endedKind: data.get("endedKind"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record the end of that partnership.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="space-y-4" data-testid="family-links">
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <form onSubmit={addRel} className="paper-card grid gap-3 p-5">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">A family link</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="type" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
            <option value="parent">Parent</option>
            <option value="adoptive">Adoptive parent</option>
            <option value="step">Step-parent</option>
            <option value="partner">Partner</option>
          </select>
          <select name="otherId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
            <option value="">Who</option>
            {people.filter((person) => person.id !== personId).map((person) => (
              <option key={person.id} value={person.id}>{person.displayName}</option>
            ))}
          </select>
        </div>
        <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          Save the link
        </button>
      </form>
      {partners.length ? (
        <form onSubmit={endRel} className="paper-card grid gap-3 p-5" data-testid="end-partnership">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Divorce or separation</p>
          <select name="id" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
            {partners.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="endedKind" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
              <option value="divorce">Divorce</option>
              <option value="separation">Separation</option>
            </select>
            <input name="endedAt" type="date" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
          </div>
          <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
            Record the end
          </button>
        </form>
      ) : null}
    </div>
  );
}
