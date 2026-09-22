"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PinMemoryForm({
  stories,
  documents,
  assets,
}: {
  stories: { id: string; title: string }[];
  documents: { id: string; title: string }[];
  assets: { id: string; title: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        note: data.get("note") || undefined,
        storyId: data.get("storyId") || undefined,
        documentId: data.get("documentId") || undefined,
        assetId: data.get("assetId") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not pin that memory.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="pin-form">
      <input name="title" required placeholder="The harvest-dance letter" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea name="note" rows={2} placeholder="Why this belongs on the family home" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="storyId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A story</option>
        {stories.map((story) => (
          <option key={story.id} value={story.id}>{story.title}</option>
        ))}
      </select>
      <select name="documentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A letter</option>
        {documents.map((document) => (
          <option key={document.id} value={document.id}>{document.title}</option>
        ))}
      </select>
      <select name="assetId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A photograph</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.title || "Untitled"}</option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">Pin this memory</button>
    </form>
  );
}
