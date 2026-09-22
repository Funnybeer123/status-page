"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = { id: string; displayName: string };

export function ReunionForm({ people }: { people: Person[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/reunions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        place: data.get("place"),
        happenedOn: data.get("happenedOn"),
        notes: data.get("notes"),
        personIds: data.getAll("personIds"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that reunion.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="reunion-form">
      <input name="title" required placeholder="Hart reunion" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="place" required placeholder="North farm" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="happenedOn" type="date" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">Who’s coming</legend>
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
        Plan the reunion
      </button>
    </form>
  );
}

export function ReunionPhotoForm({
  reunionId,
  assets,
}: {
  reunionId: string;
  assets: { id: string; title: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/reunions/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reunionId, assetId: data.get("assetId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that photograph.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="reunion-photo-form">
      <select name="assetId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A photograph from the reunion</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.title || "Untitled"}</option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the gallery
      </button>
    </form>
  );
}

export function PotluckForm({
  reunionId,
  people,
  recipes,
}: {
  reunionId: string;
  people: Person[];
  recipes: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/reunions/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reunionId,
        title: data.get("title"),
        personId: data.get("personId") || undefined,
        recipeId: data.get("recipeId") || undefined,
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that dish.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="potluck-form">
      <input name="title" required placeholder="Sunday rolls" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who is bringing it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="recipeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Cookbook recipe</option>
        {recipes.map((recipe) => (
          <option key={recipe.id} value={recipe.id}>{recipe.title}</option>
        ))}
      </select>
      <input name="notes" placeholder="Warm, in the navy-blue bowl" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a potluck dish
      </button>
    </form>
  );
}

export function RsvpButton({ reunionId, personId, coming }: { reunionId: string; personId: string; coming: boolean }) {
  const router = useRouter();
  async function toggle() {
    await fetch("/api/reunions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reunionId, personId, coming: !coming }),
    });
    router.refresh();
  }
  return (
    <button type="button" onClick={toggle} className="font-sans text-sm text-seal" data-testid="rsvp-toggle">
      {coming ? "Mark not coming" : "Mark coming"}
    </button>
  );
}
