"use client";

import { useRouter } from "next/navigation";

export function PreferDate({
  personId,
  kind,
  eventId,
  happenedOn,
}: {
  personId: string;
  kind: "birth" | "death";
  eventId?: string | null;
  happenedOn: string;
}) {
  const router = useRouter();
  async function prefer() {
    await fetch("/api/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, kind, eventId: eventId || undefined, happenedOn }),
    });
    router.refresh();
  }
  return (
    <button type="button" onClick={prefer} className="font-sans text-sm text-seal" data-testid="prefer-date">
      Prefer this date
    </button>
  );
}

export function AlternateDateForm({
  people,
}: {
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await fetch("/api/facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        kind: data.get("kind"),
        happenedOn: data.get("happenedOn"),
      }),
    });
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5 sm:grid-cols-3" data-testid="alternate-date-form">
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Person</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="kind" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="birth">Another birth date</option>
        <option value="death">Another death date</option>
      </select>
      <input name="happenedOn" type="date" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream sm:col-span-3" type="submit">
        Record the other date
      </button>
    </form>
  );
}
