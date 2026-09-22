"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { id: string; displayName?: string; title?: string; name?: string; kind?: string };

export function PersonArchiveForms({
  personId,
  people,
  places,
  documents,
  assets,
  events,
  names,
}: {
  personId: string;
  people: Option[];
  places: Option[];
  documents: Option[];
  assets: Option[];
  events: Option[];
  names: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function post(path: string, body: unknown, key: string) {
    setBusy(key);
    setError("");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    setBusy("");
    if (!response.ok) {
      setError(payload.error || "Could not save that.");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-6" data-testid="person-archive-forms">
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}

      <form
        className="paper-card grid gap-3 p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const ok = await post(
            "/api/names",
            {
              personId,
              kind: data.get("kind"),
              name: data.get("name"),
              startedAt: data.get("startedAt"),
              endedAt: data.get("endedAt"),
            },
            "name",
          );
          if (ok) event.currentTarget.reset();
        }}
      >
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Add a name</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="kind" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" defaultValue="maiden">
            <option value="maiden">Maiden</option>
            <option value="nickname">Nickname</option>
            <option value="aka">Also known as</option>
            <option value="birth">Birth name</option>
          </select>
          <input name="name" required placeholder="Whitaker" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="font-sans text-sm">From <input type="date" name="startedAt" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" /></label>
          <label className="font-sans text-sm">Until <input type="date" name="endedAt" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" /></label>
        </div>
        <button disabled={busy === "name"} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          {busy === "name" ? "Saving…" : "Save name"}
        </button>
      </form>

      <form
        className="paper-card grid gap-3 p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const ok = await post(
            "/api/residences",
            {
              personId,
              placeId: data.get("placeId") || undefined,
              name: data.get("name"),
              locality: data.get("locality"),
              region: data.get("region"),
              country: data.get("country"),
              startedAt: data.get("startedAt"),
              endedAt: data.get("endedAt"),
              notes: data.get("notes"),
            },
            "place",
          );
          if (ok) event.currentTarget.reset();
        }}
      >
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">A place they lived</p>
        <select name="placeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">New place…</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>{place.name}</option>
          ))}
        </select>
        <input name="name" placeholder="Place name" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="locality" placeholder="Town" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
          <input name="region" placeholder="County or state" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
          <input name="country" placeholder="Country" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="font-sans text-sm">From <input type="date" name="startedAt" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" /></label>
          <label className="font-sans text-sm">Until <input type="date" name="endedAt" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" /></label>
        </div>
        <input name="notes" placeholder="Farmhouse, upstairs hall…" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <button disabled={busy === "place"} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          {busy === "place" ? "Saving…" : "Save place"}
        </button>
      </form>

      <form
        className="paper-card grid gap-3 p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const ok = await post(
            "/api/events",
            {
              personId,
              otherPersonId: data.get("otherPersonId") || undefined,
              kind: data.get("kind"),
              title: data.get("title"),
              summary: data.get("summary"),
              happenedOn: data.get("happenedOn"),
              placeId: data.get("placeId") || undefined,
            },
            "event",
          );
          if (ok) event.currentTarget.reset();
        }}
      >
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">A life event</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="kind" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" defaultValue="other">
            <option value="marriage">Marriage</option>
            <option value="residence">Residence</option>
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
          <input name="title" required placeholder="Harvest dance at the Grange" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        </div>
        <textarea name="summary" rows={3} placeholder="What the family still tells" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="font-sans text-sm">Date <input type="date" name="happenedOn" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" /></label>
          <label className="font-sans text-sm">
            With
            <select name="otherPersonId" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2">
              <option value="">Nobody else</option>
              {people.filter((person) => person.id !== personId).map((person) => (
                <option key={person.id} value={person.id}>{person.displayName}</option>
              ))}
            </select>
          </label>
        </div>
        <select name="placeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Place unknown</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>{place.name}</option>
          ))}
        </select>
        <button disabled={busy === "event"} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          {busy === "event" ? "Saving…" : "Save event"}
        </button>
      </form>

      <form
        className="paper-card grid gap-3 p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const ok = await post(
            "/api/citations",
            {
              personId,
              claim: data.get("claim"),
              documentId: data.get("documentId") || undefined,
              assetId: data.get("assetId") || undefined,
              eventId: data.get("eventId") || undefined,
              nameId: data.get("nameId") || undefined,
              pageNote: data.get("pageNote"),
            },
            "cite",
          );
          if (ok) event.currentTarget.reset();
        }}
      >
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Cite a source</p>
        <input name="claim" required placeholder="Maiden name was Whitaker" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <select name="documentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Letter or note</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>{doc.title}</option>
          ))}
        </select>
        <select name="assetId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Photograph or scan</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>{asset.title}</option>
          ))}
        </select>
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="eventId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
            <option value="">Life event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
          <select name="nameId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
            <option value="">Name</option>
            {names.map((name) => (
              <option key={name.id} value={name.id}>{name.name}</option>
            ))}
          </select>
        </div>
        <input name="pageNote" placeholder="p. 1, second paragraph" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <button disabled={busy === "cite"} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          {busy === "cite" ? "Saving…" : "Save citation"}
        </button>
      </form>
    </div>
  );
}
