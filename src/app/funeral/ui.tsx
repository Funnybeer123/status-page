"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HuntFinishButton({ huntId }: { huntId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function finish() {
    const response = await fetch(`/api/hunts/${huntId}/finish`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not record that badge.");
      return;
    }
    router.refresh();
  }
  return (
    <div className="mt-6">
      <button
        type="button"
        data-testid="hunt-finish"
        className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream"
        onClick={finish}
      >
        I finished this hunt
      </button>
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}

export function SeatForm({
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
    const response = await fetch(`/api/reunions/${reunionId}/seats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        tableName: data.get("tableName"),
        seat: data.get("seat") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not seat that guest.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="seat-form">
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A guest</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <input name="tableName" required placeholder="Cottonwood table" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="seat" type="number" placeholder="Seat number" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Seat this guest
      </button>
    </form>
  );
}

export function MarkVisitButton() {
  const router = useRouter();
  async function mark() {
    await fetch("/api/since-visit", { method: "POST" });
    router.refresh();
  }
  return (
    <button type="button" data-testid="mark-visit" className="mt-4 rounded-full border border-bark/20 px-4 py-2 font-sans text-sm" onClick={mark}>
      Mark this visit seen
    </button>
  );
}

export function LifeDraftForm({
  personId,
  title,
  body,
}: {
  personId: string;
  title: string;
  body: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/life-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId,
        title: data.get("title"),
        body: data.get("body"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that draft.");
      return;
    }
    router.refresh();
  }
  async function fill() {
    const response = await fetch("/api/life-drafts/fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId }),
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error || "Ask could not fill that draft.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="life-draft-form">
      <input name="title" defaultValue={title} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea
        name="body"
        defaultValue={body}
        placeholder="Ask can fill this from the letters and stories."
        className="min-h-48 rounded-lg border border-bark/15 bg-paper px-3 py-2 text-lg leading-relaxed"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          Save the draft
        </button>
        <button
          type="button"
          data-testid="life-draft-fill"
          className="w-fit rounded-full border border-bark/20 px-4 py-2 font-sans text-sm"
          onClick={fill}
        >
          Ask, fill from letters
        </button>
      </div>
    </form>
  );
}

export function PlaceGpsForm({ placeId, gps }: { placeId: string; gps?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/places/gps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, gps: data.get("gps") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that GPS field.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-4 grid gap-3 p-5" data-testid="place-gps-form">
      <input name="gps" defaultValue={gps || ""} required placeholder="42.5278 N, 92.4453 W" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the GPS field
      </button>
    </form>
  );
}

export function NicknameNotesForm({
  nameId,
  notes,
}: {
  nameId: string;
  notes?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/dictionary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameId, notes: data.get("notes") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save how that nickname is used.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-2" data-testid={`nickname-notes-${nameId}`}>
      <input name="notes" defaultValue={notes || ""} placeholder="What the family still calls her at supper" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit font-sans text-sm text-seal" type="submit">
        How it is used
      </button>
    </form>
  );
}
