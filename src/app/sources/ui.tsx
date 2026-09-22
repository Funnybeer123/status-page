"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SourceForm({
  people,
  documents,
}: {
  people: { id: string; displayName: string }[];
  documents: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: data.get("claim"),
        personId: data.get("personId") || undefined,
        documentId: data.get("documentId") || undefined,
        pageNote: data.get("pageNote"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that source.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="source-form">
      <input name="claim" required placeholder="What this source proves" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">About whom</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>{person.displayName}</option>
          ))}
        </select>
        <select name="documentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Letter, clipping, or note</option>
          {documents.map((document) => (
            <option key={document.id} value={document.id}>{document.title}</option>
          ))}
        </select>
      </div>
      <input name="pageNote" placeholder="p. 1, second paragraph" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the source
      </button>
    </form>
  );
}
