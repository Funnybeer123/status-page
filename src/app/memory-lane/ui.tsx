"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WeatherForm({
  assetId,
  documentId,
  weather,
}: {
  assetId?: string;
  documentId?: string;
  weather?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        documentId,
        weather: data.get("weather"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that weather note.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="weather-form">
      <input
        name="weather"
        defaultValue={weather || ""}
        placeholder="A hard frost, then a clear night"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Remember the weather
      </button>
    </form>
  );
}

export function BorrowedForm({
  assetId,
  albums,
  albumId,
}: {
  assetId: string;
  albums: { id: string; title: string }[];
  albumId?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/borrowed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, albumId: data.get("albumId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that credit.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="borrowed-form">
      <select name="albumId" defaultValue={albumId || ""} className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Which album did this come from?</option>
        {albums.map((album) => (
          <option key={album.id} value={album.id}>
            {album.title}
          </option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Credit the album
      </button>
    </form>
  );
}

export function FilmCaptionForm({
  filmId,
  orals,
}: {
  filmId: string;
  orals: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/films/captions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filmId,
        seconds: data.get("seconds"),
        text: data.get("text"),
        oralAssetId: data.get("oralAssetId") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that caption.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="film-caption-form">
      <input name="seconds" required placeholder="0:12 or seconds" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="text" required placeholder="Mother cuts the Sunday rolls" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="oralAssetId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Optional oral note</option>
        {orals.map((oral) => (
          <option key={oral.id} value={oral.id}>
            {oral.title}
          </option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a silent caption
      </button>
    </form>
  );
}

export function SecretUntilForm({
  documentId,
  journalId,
  until,
}: {
  documentId?: string;
  journalId?: string;
  until?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId,
        journalId,
        secretUntil: data.get("secretUntil") || null,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not keep that secret.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="secret-until-form">
      <input
        name="secretUntil"
        type="date"
        defaultValue={until || ""}
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Keep secret until
      </button>
    </form>
  );
}

export function BranchColorForm({
  branchId,
  color,
}: {
  branchId: string;
  color?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/branches/color", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, color: data.get("color") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that color.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-center gap-3" data-testid="branch-color-form">
      <input
        name="color"
        defaultValue={color || "#4d5b3c"}
        placeholder="#4d5b3c"
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Set the branch color
      </button>
    </form>
  );
}

export function OcrConfidenceForm({
  documentId,
  score,
}: {
  documentId: string;
  score?: number | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/ocr/confidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, ocrConfidence: Number(data.get("ocrConfidence")) }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that score.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-center gap-3" data-testid="ocr-confidence-form">
      <input
        name="ocrConfidence"
        type="number"
        min={0}
        max={100}
        defaultValue={score ?? 60}
        className="w-24 rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save OCR confidence
      </button>
    </form>
  );
}
