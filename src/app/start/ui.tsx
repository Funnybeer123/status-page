"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StartStep } from "@/lib/startHere";

export function StartWizard({
  people,
  personId,
  steps,
}: {
  people: { id: string; displayName: string }[];
  personId?: string | null;
  steps: StartStep[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function claim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("claim");
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: data.get("personId") || null }),
    });
    const payload = await response.json();
    setBusy("");
    if (!response.ok) {
      setError(payload.error || "Could not claim that person.");
      return;
    }
    router.refresh();
  }

  async function story(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("story");
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        body: data.get("body"),
        recordedAt: data.get("recordedAt") || undefined,
        tellerPersonId: personId || undefined,
        personIds: personId ? [personId] : [],
      }),
    });
    const payload = await response.json();
    setBusy("");
    if (!response.ok) {
      setError(payload.error || "Could not save that story.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  async function photo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("photo");
    setError("");
    const data = new FormData(event.currentTarget);
    if (personId) data.set("personIds", personId);
    const response = await fetch("/api/assets", { method: "POST", body: data });
    const payload = await response.json();
    setBusy("");
    if (!response.ok) {
      setError(payload.error || "Could not upload that photograph.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-6" data-testid="start-wizard">
      <ol className="space-y-2 font-sans text-sm" data-testid="start-steps">
        {steps.map((step) => (
          <li key={step.id} className="paper-card flex items-center justify-between p-4">
            <span>{step.title}</span>
            <span className="text-gold">{step.done ? "Done" : "Still to do"}</span>
          </li>
        ))}
      </ol>
      <form onSubmit={claim} className="paper-card grid gap-3 p-5" data-testid="start-claim">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">1. Claim yourself</p>
        <select name="personId" defaultValue={personId || ""} className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">I am not on the tree yet</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
            </option>
          ))}
        </select>
        <button disabled={busy === "claim"} className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          {busy === "claim" ? "Saving…" : "This is me"}
        </button>
      </form>
      <form onSubmit={story} className="paper-card grid gap-3 p-5" data-testid="start-story">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">2. Add one story</p>
        <input name="title" required placeholder="A story the family still tells" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <textarea name="body" required rows={5} placeholder="Write it the way it was told." className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <input type="date" name="recordedAt" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <button disabled={busy === "story" || !personId} className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          {busy === "story" ? "Saving…" : "Save this story"}
        </button>
      </form>
      <form onSubmit={photo} className="paper-card grid gap-3 p-5" data-testid="start-photo">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">3. Upload one photograph</p>
        <input type="file" name="file" accept="image/*" required className="font-sans text-sm" />
        <input name="title" placeholder="What the family calls this picture" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <button disabled={busy === "photo" || !personId} className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          {busy === "photo" ? "Saving…" : "Upload this photograph"}
        </button>
      </form>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}
