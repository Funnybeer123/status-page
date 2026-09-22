"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FileBoxForm({
  assetId,
  people,
}: {
  assetId: string;
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, personId: data.get("personId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not file that upload.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-center gap-2" data-testid={`file-box-${assetId}`}>
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">File onto someone</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        File this
      </button>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
    </form>
  );
}

export function FileManyForm({
  assets,
  people,
}: {
  assets: { id: string; title: string | null }[];
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const assetIds = data.getAll("assetIds").map(String).filter(Boolean);
    const response = await fetch("/api/box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds, personId: data.get("personId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not file those uploads.");
      return;
    }
    router.refresh();
  }
  if (!assets.length) return null;
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="file-many-form">
      <p className="font-sans text-sm text-bark">File several leftover uploads onto one person.</p>
      <div className="flex flex-wrap gap-2">
        {assets.map((asset) => (
          <label key={asset.id} className="rounded-full border border-bark/15 px-3 py-1 font-sans text-sm">
            <input type="checkbox" name="assetIds" value={asset.id} className="mr-2" />
            {asset.title || "Untitled upload"}
          </label>
        ))}
      </div>
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">File onto someone</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        File these together
      </button>
    </form>
  );
}

export function HoldForm({
  heirloomId,
  people,
}: {
  heirloomId: string;
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/heirlooms/holds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heirloomId,
        personId: data.get("personId"),
        heldFrom: data.get("heldFrom") || undefined,
        heldUntil: data.get("heldUntil") || undefined,
        note: data.get("note") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record who held it.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="hold-form">
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who held it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="heldFrom" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="heldUntil" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      <input name="note" placeholder="How it passed on" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the chain
      </button>
    </form>
  );
}

export function MeetingForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const personIds = data.getAll("personIds").map(String).filter(Boolean);
    const response = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        notes: data.get("notes"),
        happenedOn: data.get("happenedOn") || undefined,
        personIds,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save those notes.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="meeting-form">
      <input name="title" required placeholder="Harvest planning at Meg's" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="happenedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea name="notes" required rows={4} placeholder="What the family decided" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="personIds" multiple className="min-h-32 rounded-lg border border-bark/15 bg-paper px-3 py-2">
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the meeting notes
      </button>
    </form>
  );
}

export function HangPortraitForm({
  personId,
  assets,
}: {
  personId: string;
  assets: { id: string; title: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/portraits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, assetId: data.get("assetId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not hang that portrait.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-center gap-2" data-testid={`hang-portrait-${personId}`}>
      <select name="assetId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Hang a portrait</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.title || "Untitled photograph"}
          </option>
        ))}
      </select>
      <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Hang this
      </button>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
    </form>
  );
}

export function DeedForm({
  landId,
  assets,
}: {
  landId: string;
  assets: { id: string; title: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/land/deed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landId, assetId: data.get("assetId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not attach that deed.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-center gap-2" data-testid={`deed-form-${landId}`}>
      <select name="assetId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Attach a deed image</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.title || "Untitled scan"}
          </option>
        ))}
      </select>
      <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Attach the deed
      </button>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
    </form>
  );
}
