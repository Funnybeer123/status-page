"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InterviewPlanForm({
  people,
}: {
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/hour/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        scheduledOn: data.get("scheduledOn"),
        notes: data.get("notes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that interview date.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="interview-plan-form">
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who to sit with</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      <input type="date" name="scheduledOn" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required />
      <input name="notes" placeholder="What you still want to ask" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Put it on the family hour
      </button>
    </form>
  );
}

export function PostageForm({ letterId, postage }: { letterId: string; postage?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/letters/${letterId}/postage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postage: data.get("postage") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that postage.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-2" data-testid="postage-form">
      <input
        name="postage"
        defaultValue={postage || ""}
        placeholder="3 cents"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Remember the postage
      </button>
    </form>
  );
}

export function SpokenByForm({
  assetId,
  people,
  personId,
}: {
  assetId: string;
  people: { id: string; displayName: string }[];
  personId?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/oral/spoken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, personId: data.get("personId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save who spoke.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-2" data-testid="spoken-by-form">
      <select name="personId" defaultValue={personId || ""} className="rounded-lg border border-bark/15 bg-paper px-3 py-2" required>
        <option value="">Who is speaking</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Credit the speaker
      </button>
    </form>
  );
}

export function RulesForm({ rules }: { rules?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rulesText: data.get("rulesText") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save the family rules.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="rules-form">
      <textarea
        name="rulesText"
        rows={8}
        defaultValue={rules || ""}
        placeholder="How this family keeps living people private, and what Ask may use."
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the family rules
      </button>
    </form>
  );
}
