"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FragileToggle({ letterId, fragile }: { letterId: string; fragile: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(fragile);
  const [error, setError] = useState("");
  async function toggle() {
    const next = !on;
    const response = await fetch(`/api/letters/${letterId}/fragile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fragile: next }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not mark that letter.");
      return;
    }
    setOn(next);
    router.refresh();
  }
  return (
    <div className="mt-4" data-testid="fragile-toggle">
      <button type="button" onClick={toggle} className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm">
        {on ? "This is a fragile original" : "Mark as a fragile original"}
      </button>
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}

export function QuietToggle({ quiet }: { quiet: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(quiet);
  const [error, setError] = useState("");
  async function toggle() {
    const next = !on;
    const response = await fetch("/api/quiet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiet: next }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not change quiet mode.");
      return;
    }
    setOn(next);
    router.refresh();
  }
  return (
    <div className="mt-6" data-testid="quiet-toggle">
      <button type="button" onClick={toggle} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream">
        {on ? "Turn quiet mode off" : "Turn quiet mode on"}
      </button>
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}

export function ComparePicker({
  people,
  a,
  b,
}: {
  people: { id: string; displayName: string }[];
  a?: string;
  b?: string;
}) {
  return (
    <form method="get" className="paper-card mt-6 grid gap-3 p-5" data-testid="compare-picker">
      <select name="a" defaultValue={a || ""} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">First person</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="b" defaultValue={b || ""} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Second person</option>
        {people.map((person) => (
          <option key={`b-${person.id}`} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Compare residences
      </button>
    </form>
  );
}
