"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FoldForm({ letterId, foldPattern }: { letterId: string; foldPattern?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/letters/${letterId}/fold`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foldPattern: data.get("foldPattern") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that fold.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-2" data-testid="fold-form">
      <input
        name="foldPattern"
        defaultValue={foldPattern || ""}
        placeholder="in thirds"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Remember the fold
      </button>
    </form>
  );
}

export function InheritanceForm({
  people,
  wills,
  probates,
}: {
  people: { id: string; displayName: string }[];
  wills: { id: string; title: string }[];
  probates: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/inheritances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        title: data.get("title"),
        documentId: data.get("documentId") || undefined,
        probateId: data.get("probateId") || undefined,
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that inheritance.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="inheritance-form">
      <input name="title" placeholder="Navy hatband" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who inherited it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      <select name="documentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Tied to a will</option>
        {wills.map((will) => (
          <option key={will.id} value={will.id}>
            {will.title}
          </option>
        ))}
      </select>
      <select name="probateId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Tied to probate</option>
        {probates.map((row) => (
          <option key={row.id} value={row.id}>
            {row.title}
          </option>
        ))}
      </select>
      <input name="notes" placeholder="Where it lives now" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add who inherited it
      </button>
    </form>
  );
}

export function ShiftForm({
  reunionId,
  people,
}: {
  reunionId: string;
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/reunions/${reunionId}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        label: data.get("label"),
        startsAt: data.get("startsAt"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that shift.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="shift-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who is volunteering</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      <input name="label" placeholder="Morning scanner" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="startsAt" placeholder="morning" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Bring the portable scanner" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Sign up for a shift
      </button>
    </form>
  );
}

export function FavoriteStarForm({
  personId,
  photos,
  favoriteAssetId,
}: {
  personId: string;
  photos: { id: string; title: string | null }[];
  favoriteAssetId?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, assetId: data.get("assetId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that favorite.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-2" data-testid="favorite-star-form">
      <select name="assetId" defaultValue={favoriteAssetId || ""} className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Favorite photograph</option>
        {photos.map((photo) => (
          <option key={photo.id} value={photo.id}>
            {photo.title || "Untitled photograph"}
          </option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Star this photograph
      </button>
    </form>
  );
}

export function BilingualToggle({ on }: { on: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function toggle() {
    const response = await fetch("/api/ask/bilingual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bilingual: !on }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not change Ask.");
      return;
    }
    router.refresh();
  }
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={toggle}
        className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream"
        data-testid="bilingual-toggle"
      >
        {on ? "Prefer the original wording" : "Prefer the translation"}
      </button>
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}
