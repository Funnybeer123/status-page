"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FIRST_TAGS, scrapbookLabel } from "@/lib/scrapbook";
import { restoreSliderHint } from "@/lib/restoreSlider";

export function NightToggle({ night }: { night: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(night);
  const [error, setError] = useState("");
  async function toggle() {
    const next = !on;
    const response = await fetch("/api/night", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ night: next }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not change night mode.");
      return;
    }
    setOn(next);
    router.refresh();
  }
  return (
    <div className="mt-6" data-testid="night-toggle">
      <button type="button" onClick={toggle} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream">
        {on ? "Turn night mode off" : "Turn night mode on"}
      </button>
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}

export function BirthDateForm({ personId, name }: { personId: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/people/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate: data.get("birthDate") }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error || "Could not save that birth date.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]" data-testid={`birth-date-form-${personId}`}>
      <label className="sr-only" htmlFor={`birth-${personId}`}>
        Birth date for {name}
      </label>
      <input
        id={`birth-${personId}`}
        name="birthDate"
        type="date"
        required
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      <button disabled={busy} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        {busy ? "Saving…" : "Save birth date"}
      </button>
      {error ? <p className="font-sans text-sm text-seal sm:col-span-2">{error}</p> : null}
    </form>
  );
}

export function RestoreSlider({
  originalSrc,
  cleanedSrc,
}: {
  originalSrc: string;
  cleanedSrc: string;
}) {
  const [pct, setPct] = useState(50);
  return (
    <div className="paper-card relative mt-8 overflow-hidden" data-testid="restore-slider">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cleanedSrc} alt="Cleaned copy" className="block w-full bg-cream" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={originalSrc} alt="Original scan" className="h-full w-full object-cover" />
      </div>
      <label className="mt-3 block px-4 pb-4 font-sans text-sm text-gold">
        {restoreSliderHint()}
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(event) => setPct(Number(event.target.value))}
          className="mt-2 w-full"
          data-testid="restore-slider-input"
        />
      </label>
    </div>
  );
}

export function EnvelopeForm({
  letterId,
  from,
  to,
  assetId,
  assets,
}: {
  letterId: string;
  from?: string | null;
  to?: string | null;
  assetId?: string | null;
  assets: { id: string; title: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/letters/${letterId}/envelope`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        envelopeFrom: data.get("envelopeFrom"),
        envelopeTo: data.get("envelopeTo"),
        envelopeAssetId: data.get("envelopeAssetId") || null,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error || "Could not save that envelope.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="envelope-form">
      <input
        name="envelopeFrom"
        defaultValue={from || ""}
        placeholder="From — Eleanor Whitaker, Cedar Falls"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      <input
        name="envelopeTo"
        defaultValue={to || ""}
        placeholder="To — Ruth Whitaker"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      <select name="envelopeAssetId" defaultValue={assetId || ""} className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Envelope scan (optional)</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.title || "Untitled scan"}
          </option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button disabled={busy} className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        {busy ? "Saving…" : "Save the envelope"}
      </button>
    </form>
  );
}

export function VaultForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        body: data.get("body"),
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error || "Could not save that vault note.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="vault-form">
      <input name="title" required placeholder="Ancestry login" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea
        name="body"
        required
        rows={4}
        placeholder="Shared account notes. Owners only."
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button disabled={busy} className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        {busy ? "Saving…" : "Add to the vault"}
      </button>
    </form>
  );
}

export function FirstEventForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        kind: "other",
        title: data.get("title"),
        happenedOn: data.get("happenedOn") || undefined,
        firstTag: data.get("firstTag"),
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error || "Could not save that first.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="first-event-form">
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Whose first</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      <select name="firstTag" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        {FIRST_TAGS.map((tag) => (
          <option key={tag} value={tag}>
            {scrapbookLabel(tag)}
          </option>
        ))}
      </select>
      <input name="title" required placeholder="The Cedar Falls bungalow" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="happenedOn" type="date" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button disabled={busy} className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        {busy ? "Saving…" : "Add a first"}
      </button>
    </form>
  );
}

export function SpokenNameForm({
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
    const response = await fetch(`/api/people/${personId}/spoken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: data.get("assetId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that spoken name.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap gap-2" data-testid={`spoken-form-${personId}`}>
      <select name="assetId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Spoken name</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.title || "Untitled recording"}
          </option>
        ))}
      </select>
      <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the soundboard
      </button>
      {error ? <p className="w-full font-sans text-sm text-seal">{error}</p> : null}
    </form>
  );
}
