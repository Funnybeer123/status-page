"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PersonForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: data.get("displayName"),
        givenName: data.get("givenName"),
        middleName: data.get("middleName"),
        familyName: data.get("familyName"),
        birthDate: data.get("birthDate"),
        deathDate: data.get("deathDate"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setBusy(false);
      setError(payload.error);
      return;
    }
    const parentId = String(data.get("parentId") || "");
    const parentType = String(data.get("parentType") || "parent");
    const partnerId = String(data.get("partnerId") || "");
    if (parentId) {
      await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPersonId: parentId, toPersonId: payload.person.id, type: parentType }),
      });
    }
    if (partnerId) {
      await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPersonId: payload.person.id, toPersonId: partnerId, type: "partner" }),
      });
    }
    router.push(`/people/${payload.person.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid max-w-xl gap-4 p-6">
      <input name="displayName" required placeholder="Display name" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="givenName" placeholder="Given name" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="middleName" placeholder="Middle name" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="familyName" placeholder="Family name" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="font-sans text-sm">Birth <input name="birthDate" type="date" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" /></label>
        <label className="font-sans text-sm">Death <input name="deathDate" type="date" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" /></label>
      </div>
      <textarea name="notes" rows={4} placeholder="Notes the family still tells" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <label className="font-sans text-sm">
        Parent (optional)
        <select name="parentId" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">None</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>{person.displayName}</option>
          ))}
        </select>
      </label>
      <label className="font-sans text-sm">
        How they are a parent
        <select name="parentType" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="parent">Parent</option>
          <option value="adoptive">Adoptive parent</option>
          <option value="step">Step-parent</option>
        </select>
      </label>
      <label className="font-sans text-sm">
        Partner (optional)
        <select name="partnerId" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">None</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>{person.displayName}</option>
          ))}
        </select>
      </label>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button disabled={busy} className="rounded-full bg-seal py-2 font-sans text-cream" type="submit">
        {busy ? "Saving…" : "Save person"}
      </button>
    </form>
  );
}
