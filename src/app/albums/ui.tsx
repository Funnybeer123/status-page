"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export function AlbumSlideshow({
  slides,
}: {
  slides: { src: string; title: string }[];
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % slides.length);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [playing, slides.length]);
  if (!slides.length) return null;
  const current = slides[index] ?? slides[0];
  return (
    <div className="paper-card mt-8 overflow-hidden" data-testid="album-slideshow">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current.src} alt={current.title} className="aspect-video w-full object-cover" />
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="font-display text-xl">{current.title}</p>
        <div className="flex gap-2 font-sans text-sm">
          <button
            type="button"
            className="rounded-full border border-bark/15 px-3 py-1"
            onClick={() => setIndex((value) => (value - 1 + slides.length) % slides.length)}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-full bg-seal px-3 py-1 text-cream"
            data-testid="album-slideshow-play"
            onClick={() => setPlaying((on) => !on)}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="rounded-full border border-bark/15 px-3 py-1"
            onClick={() => setIndex((value) => (value + 1) % slides.length)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
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
