"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AlbumCreateForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: data.get("title"), summary: data.get("summary") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not create that album.");
      return;
    }
    router.push(`/albums/${payload.album.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="album-create">
      <input name="title" required placeholder="Harvest dance album" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="album-title" />
      <textarea name="summary" rows={2} placeholder="What belongs together" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">Start an album</button>
    </form>
  );
}

export function AlbumAddForm({
  albumId,
  assets,
  documents,
}: {
  albumId: string;
  assets: { id: string; title: string | null }[];
  documents: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/albums/${albumId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: data.get("assetId") || undefined,
        documentId: data.get("documentId") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="album-add">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Add to this album</p>
      <select name="assetId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A photograph or film</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.title || "Untitled"}</option>
        ))}
      </select>
      <select name="documentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A letter or oral note</option>
        {documents.map((document) => (
          <option key={document.id} value={document.id}>{document.title}</option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">Add to the album</button>
    </form>
  );
}
