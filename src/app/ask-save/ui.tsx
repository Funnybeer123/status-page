"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BringForm({
  reunionId,
  people,
  assets,
  heirlooms,
}: {
  reunionId: string;
  people: { id: string; displayName: string }[];
  assets: { id: string; title: string | null }[];
  heirlooms: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/reunions/bring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reunionId,
        personId: data.get("personId"),
        kind: data.get("kind"),
        title: data.get("title"),
        assetId: data.get("assetId") || undefined,
        heirloomId: data.get("heirloomId") || undefined,
        notes: data.get("notes") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that to the bring-list.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="bring-form">
      <select name="kind" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="photo">Photograph</option>
        <option value="heirloom">Heirloom</option>
        <option value="dish">Dish</option>
      </select>
      <input name="title" required placeholder="What they are bringing" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Who is bringing it</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="assetId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A photograph (optional)</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.title || "Untitled"}</option>
        ))}
      </select>
      <select name="heirloomId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">An heirloom (optional)</option>
        {heirlooms.map((item) => (
          <option key={item.id} value={item.id}>{item.title}</option>
        ))}
      </select>
      <input name="notes" placeholder="Notes" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the bring-list
      </button>
    </form>
  );
}

export function PlacePhotoForm({
  placeId,
  assets,
}: {
  placeId: string;
  assets: { id: string; title: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/places/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, assetId: data.get("assetId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not put that photograph on the chronicle.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-center gap-2" data-testid="place-photo-form">
      <select name="assetId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A photograph of this place</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.title || "Untitled"}</option>
        ))}
      </select>
      <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add to the chronicle
      </button>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
    </form>
  );
}

export function BiblePageForm({
  bibleId,
  assets,
}: {
  bibleId: string;
  assets: { id: string; title: string | null }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/bibles/page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bibleId, assetId: data.get("assetId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not attach that Bible page.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-center gap-2" data-testid={`bible-page-form-${bibleId}`}>
      <select name="assetId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Attach a Bible page image</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.title || "Untitled scan"}</option>
        ))}
      </select>
      <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Attach the page
      </button>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
    </form>
  );
}

export function ObituaryPortraitForm({
  documentId,
  people,
}: {
  documentId: string;
  people: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/obituaries/portrait", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, personId: data.get("personId") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not link that memorial portrait.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-center gap-2" data-testid={`obituary-portrait-form-${documentId}`}>
      <select name="personId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Link to a memorial</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Link the portrait
      </button>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
    </form>
  );
}

export function NoticeMuteForm({
  categories,
}: {
  categories: { category: string; muted: boolean; line: string }[];
}) {
  const router = useRouter();
  async function toggle(category: string, muted: boolean) {
    await fetch("/api/notifications/mute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, muted }),
    });
    router.refresh();
  }
  return (
    <ul className="mt-6 space-y-3" data-testid="notice-mute-list">
      {categories.map((item) => (
        <li key={item.category} className="paper-card flex flex-wrap items-center justify-between gap-3 p-4">
          <p>{item.line}</p>
          <button
            type="button"
            data-testid={`mute-${item.category}`}
            className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm"
            onClick={() => toggle(item.category, !item.muted)}
          >
            {item.muted ? "Unmute" : "Mute"}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function StoryEditForm({
  storyId,
  title,
  body,
}: {
  storyId: string;
  title: string;
  body: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/stories/${storyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: data.get("title"), body: data.get("body") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not edit that story.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="story-edit-form">
      <input name="title" defaultValue={title} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea name="body" defaultValue={body} rows={8} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the story
      </button>
    </form>
  );
}
