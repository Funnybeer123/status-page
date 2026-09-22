"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function YearSlider({ year }: { year: number }) {
  const [value, setValue] = useState(String(year));
  return (
    <form method="get" action="/tree/when" className="paper-card mt-6 grid gap-3 p-5" data-testid="alive-when-slider">
      <label className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Year</label>
      <input
        type="range"
        min={1800}
        max={2030}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-full"
        data-testid="alive-when-range"
      />
      <input
        type="number"
        name="year"
        min={1000}
        max={2100}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-32 rounded-lg border border-bark/15 bg-paper px-3 py-2"
        data-testid="alive-when-year"
      />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Show who was alive
      </button>
    </form>
  );
}

export function MysteryGuessForm({
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
    const response = await fetch("/api/mystery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        personId: data.get("personId") || undefined,
        name: data.get("name"),
        note: data.get("note"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that guess.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-2" data-testid="mystery-guess-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Someone not on the tree yet</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      <input name="name" placeholder="A name the family still uses" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="note" placeholder="Why you think so" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Guess who this is
      </button>
    </form>
  );
}

export function ShopItemForm({ reunionId }: { reunionId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/reunions/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reunionId,
        label: data.get("label"),
        quantity: data.get("quantity") ? Number(data.get("quantity")) : undefined,
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that item.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="shop-form">
      <input name="label" placeholder="Plates, chairs, name tags" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="quantity" type="number" min={1} placeholder="How many" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Who is picking them up" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the shopping list
      </button>
    </form>
  );
}

export function PlaceNameForm({
  places,
}: {
  places: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/places/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeId: data.get("placeId"),
        name: data.get("name"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that family name.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="place-name-form">
      <select name="placeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Which farm or street</option>
        {places.map((place) => (
          <option key={place.id} value={place.id}>
            {place.name}
          </option>
        ))}
      </select>
      <input name="name" placeholder="Sam’s place" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="How the family still says it" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Remember the family name
      </button>
    </form>
  );
}

export function ReadLaterButton({ documentId, storyId }: { documentId?: string; storyId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onClick() {
    const response = await fetch("/api/later", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, storyId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that for later.");
      return;
    }
    router.refresh();
  }
  return (
    <span>
      <button
        type="button"
        onClick={onClick}
        className="rounded-full border border-bark/20 px-4 py-1 font-sans text-sm"
        data-testid="read-later-button"
      >
        Read later
      </button>
      {error ? <span className="ml-2 font-sans text-sm text-seal">{error}</span> : null}
    </span>
  );
}

export function CheckinButton({ reunionId, personId, arrived }: { reunionId: string; personId: string; arrived: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onClick() {
    const response = await fetch("/api/reunions/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reunionId, personId, arrived: !arrived }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not mark that guest.");
      return;
    }
    router.refresh();
  }
  return (
    <span>
      <button
        type="button"
        onClick={onClick}
        className="rounded-full bg-seal px-4 py-1 font-sans text-sm text-cream"
        data-testid="checkin-button"
      >
        {arrived ? "Mark as not arrived" : "Mark as arrived"}
      </button>
      {error ? <span className="ml-2 font-sans text-sm text-seal">{error}</span> : null}
    </span>
  );
}
