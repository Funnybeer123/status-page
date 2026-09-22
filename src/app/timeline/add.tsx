"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TimelineAddEvent({
  people,
  places,
  defaultPersonId,
  defaultDate,
}: {
  people: { id: string; displayName: string }[];
  places: { id: string; name: string }[];
  defaultPersonId?: string;
  defaultDate?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: data.get("personId"),
        otherPersonId: data.get("otherPersonId") || undefined,
        kind: data.get("kind"),
        title: data.get("title"),
        summary: data.get("summary"),
        happenedOn: data.get("happenedOn"),
        placeId: data.get("placeId") || undefined,
        name: data.get("name"),
        locality: data.get("locality"),
        region: data.get("region"),
        country: data.get("country"),
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error || "Could not add that event.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
    router.push(`/timeline#event-${payload.event.id}`);
  }

  return (
    <form id="add-event" onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="timeline-add-event">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Add a missing event</p>
      <p className="text-bark">Write the vital, move, or other day the history still skips.</p>
      <p className="font-sans text-sm text-bark">
        Or add a <Link href="/letters/new" className="text-seal">letter or oral note</Link>, a{" "}
        <Link href="/archive" className="text-seal">photograph or film</Link>, or a{" "}
        <Link href="/stories" className="text-seal">story</Link> from here.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="font-sans text-sm">
          Who
          <select name="personId" required defaultValue={defaultPersonId || people[0]?.id} className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="timeline-add-person">
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.displayName}</option>
            ))}
          </select>
        </label>
        <label className="font-sans text-sm">
          Kind
          <select name="kind" defaultValue="other" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2">
            <option value="birth">Birth</option>
            <option value="death">Death</option>
            <option value="marriage">Marriage</option>
            <option value="residence">Move / residence</option>
            <option value="immigration">Immigration</option>
            <option value="occupation">Occupation</option>
            <option value="education">Education</option>
            <option value="religion">Religion</option>
            <option value="reunion">Reunion</option>
            <option value="military">Military</option>
            <option value="census">Census</option>
            <option value="burial">Burial</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
      <input name="title" required placeholder="What happened" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="timeline-add-title" />
      <textarea name="summary" rows={2} placeholder="What the family still tells" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="font-sans text-sm">
          Date
          <input type="date" name="happenedOn" defaultValue={defaultDate} className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="timeline-add-date" />
        </label>
        <label className="font-sans text-sm">
          With
          <select name="otherPersonId" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2">
            <option value="">Nobody else</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.displayName}</option>
            ))}
          </select>
        </label>
      </div>
      <select name="placeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Known place, or name a new one below</option>
        {places.map((place) => (
          <option key={place.id} value={place.id}>{place.name}</option>
        ))}
      </select>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input name="name" placeholder="New place" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="locality" placeholder="Town" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="region" placeholder="County or state" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input name="country" placeholder="Country" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </div>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button disabled={busy} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit" data-testid="timeline-add-submit">
        {busy ? "Saving…" : "Add to the history"}
      </button>
    </form>
  );
}
