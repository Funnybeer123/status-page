"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PhotoTagForm({
  assetId,
  people,
  taggedIds,
}: {
  assetId: string;
  people: { id: string; displayName: string }[];
  taggedIds: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const remaining = people.filter((person) => !taggedIds.includes(person.id));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/assets/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          personId: data.get("personId"),
          x: data.get("x") ? Number(data.get("x")) : undefined,
          y: data.get("y") ? Number(data.get("y")) : undefined,
        }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not tag that person.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  if (!remaining.length) return null;

  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="photo-tag-form">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Who is in this photograph</p>
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Choose a person</option>
        {remaining.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input name="x" type="number" min={0} max={100} step={0.1} placeholder="Left % on the picture" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="y" type="number" min={0} max={100} step={0.1} placeholder="Top % on the picture" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Tag this person
      </button>
    </form>
  );
}

export function PhotoLocateForm({
  assetId,
  tags,
}: {
  assetId: string;
  tags: { personId: string; name: string; x: number | null; y: number | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const missing = tags.filter((tag) => tag.x == null || tag.y == null);
  if (!missing.length) return null;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/assets/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        personId: data.get("personId"),
        x: Number(data.get("x")),
        y: Number(data.get("y")),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not place that person.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-4 grid gap-3 p-5" data-testid="photo-locate-form">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Who is where</p>
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Someone already tagged</option>
        {missing.map((tag) => (
          <option key={tag.personId} value={tag.personId}>{tag.name}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input name="x" type="number" min={0} max={100} step={0.1} required placeholder="Left %" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="y" type="number" min={0} max={100} step={0.1} required placeholder="Top %" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Place them on the picture
      </button>
    </form>
  );
}
