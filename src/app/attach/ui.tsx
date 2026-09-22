"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { id: string; label: string };

function SelectForm({
  action,
  testId,
  submit,
  fields,
}: {
  action: string;
  testId: string;
  submit: string;
  fields: { name: string; label: string; options: Option[] }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && value) payload[key] = value;
    }
    const response = await fetch(action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Could not save that.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid={testId}>
      {fields.map((field) => (
        <select key={field.name} name={field.name} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">{field.label}</option>
          {field.options.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      ))}
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        {submit}
      </button>
    </form>
  );
}

export function ScanAttachForm({
  households,
  assets,
}: {
  households: Option[];
  assets: Option[];
}) {
  return (
    <SelectForm
      action="/api/households/scan"
      testId="census-scan-form"
      submit="Attach the census scan"
      fields={[
        { name: "householdId", label: "Which household", options: households },
        { name: "assetId", label: "Which scan", options: assets },
      ]}
    />
  );
}

export function ManifestAttachForm({
  voyages,
  assets,
}: {
  voyages: Option[];
  assets: Option[];
}) {
  return (
    <SelectForm
      action="/api/voyages/manifest"
      testId="voyage-manifest-form"
      submit="Attach the ship manifest"
      fields={[
        { name: "voyageId", label: "Which voyage", options: voyages },
        { name: "assetId", label: "Which scan", options: assets },
      ]}
    />
  );
}

export function SuggestionReview({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function act(status: "accepted" | "dismissed") {
    const response = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Could not review that correction.");
      return;
    }
    router.refresh();
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream"
        data-testid="accept-suggestion"
        onClick={() => act("accepted")}
      >
        Accept
      </button>
      <button
        type="button"
        className="rounded-full border border-bark/15 px-4 py-2 font-sans text-sm"
        data-testid="dismiss-suggestion"
        onClick={() => act("dismissed")}
      >
        Dismiss
      </button>
      {error ? <p className="w-full font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}

export function ShareJournal({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function share() {
    const response = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, share: true }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Could not share that entry.");
      return;
    }
    router.refresh();
  }
  return (
    <div className="mt-3">
      <button
        type="button"
        className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream"
        data-testid="share-journal"
        onClick={share}
      >
        Share as a story
      </button>
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}

export function CalendarTokenForm({ hasToken }: { hasToken: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/cal/token", { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Could not make a calendar address.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="webcal-token-form">
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        {hasToken ? "Make a new calendar address" : "Make a calendar address"}
      </button>
    </form>
  );
}

export function LivesForm({
  people,
  aId,
  bId,
}: {
  people: { id: string; displayName: string }[];
  aId?: string;
  bId?: string;
}) {
  const router = useRouter();
  return (
    <form
      className="paper-card mt-8 grid gap-3 p-5 sm:grid-cols-2"
      data-testid="two-lives-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        router.push(`/lives?a=${data.get("a")}&b=${data.get("b")}`);
      }}
    >
      <select name="a" defaultValue={aId || ""} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">First life</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="b" defaultValue={bId || ""} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Second life</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream sm:col-span-2" type="submit">
        Put them on one timeline
      </button>
    </form>
  );
}

export function HomeMergeForm({
  homes,
}: {
  homes: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/homes/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId: data.get("keepId"), dropId: data.get("dropId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not merge those houses.");
      return;
    }
    router.refresh();
    router.push(`/homes/${payload.home.id}`);
  }
  if (homes.length < 2) return null;
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="home-merge-form">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Merge a duplicate house</p>
      <select name="keepId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        {homes.map((home) => (
          <option key={home.id} value={home.id}>{home.title}</option>
        ))}
      </select>
      <select name="dropId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="home-merge-drop">
        {homes.map((home) => (
          <option key={`drop-${home.id}`} value={home.id}>{home.title}</option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit" data-testid="home-merge-submit">
        Merge into the first house
      </button>
    </form>
  );
}
