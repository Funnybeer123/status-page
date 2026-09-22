"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HuntForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/hunts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: data.get("title"), notes: data.get("notes") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not start that hunt.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
    if (payload.hunt?.id) router.push(`/hunts/${payload.hunt.id}`);
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="hunt-form">
      <input name="title" required placeholder="Harvest scavenger hunt" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="notes" placeholder="Clues that point back to the archive" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Start a hunt
      </button>
    </form>
  );
}

export function HuntClueForm({
  huntId,
  letters,
  photos,
  places,
}: {
  huntId: string;
  letters: { id: string; title: string }[];
  photos: { id: string; title: string | null }[];
  places: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [kind, setKind] = useState("letter");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/hunts/clues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        huntId,
        clue: data.get("clue"),
        targetKind: data.get("targetKind"),
        answer: data.get("answer"),
        citation: data.get("citation") || undefined,
        documentId: data.get("documentId") || undefined,
        assetId: data.get("assetId") || undefined,
        placeId: data.get("placeId") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not add that clue.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="hunt-clue-form">
      <textarea name="clue" required placeholder="Look for the letter about the hatband" className="min-h-24 rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select
        name="targetKind"
        required
        value={kind}
        onChange={(event) => setKind(event.target.value)}
        className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
      >
        <option value="letter">Letter</option>
        <option value="photo">Photograph</option>
        <option value="place">Place</option>
      </select>
      <input name="answer" required placeholder="The harvest letter" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="citation" placeholder="Cited from the harvest letter" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {kind === "letter" ? (
        <select name="documentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Cite a letter</option>
          {letters.map((letter) => (
            <option key={letter.id} value={letter.id}>{letter.title}</option>
          ))}
        </select>
      ) : null}
      {kind === "photo" ? (
        <select name="assetId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Cite a photograph</option>
          {photos.map((photo) => (
            <option key={photo.id} value={photo.id}>{photo.title || "Untitled"}</option>
          ))}
        </select>
      ) : null}
      {kind === "place" ? (
        <select name="placeId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Cite a place</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>{place.name}</option>
          ))}
        </select>
      ) : null}
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add the clue
      </button>
    </form>
  );
}

export function PlacePinForm({
  places,
  letters,
  stories,
}: {
  places: { id: string; name: string }[];
  letters: { id: string; title: string }[];
  stories: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/place-pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placeId: data.get("placeId"),
        title: data.get("title"),
        documentId: data.get("documentId") || undefined,
        storyId: data.get("storyId") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not pin that to the map.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="place-pin-form">
      <input name="title" required placeholder="Harvest letter at the Grange" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="placeId" required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A place on the map</option>
        {places.map((place) => (
          <option key={place.id} value={place.id}>{place.name}</option>
        ))}
      </select>
      <select name="documentId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A letter</option>
        {letters.map((letter) => (
          <option key={letter.id} value={letter.id}>{letter.title}</option>
        ))}
      </select>
      <select name="storyId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">A story</option>
        {stories.map((story) => (
          <option key={story.id} value={story.id}>{story.title}</option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Pin it to the map
      </button>
    </form>
  );
}

export function NewsletterDraftForm({ month, body }: { month: string; body: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/newsletter/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: data.get("month"),
        body: data.get("body"),
        publish: data.get("publish") === "1",
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that draft.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-6 grid gap-3 p-5" data-testid="newsletter-draft-form">
      <input name="month" defaultValue={month} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea
        name="body"
        required
        defaultValue={body}
        placeholder="Dear family — this month we found the harvest letter…"
        className="min-h-48 rounded-lg border border-bark/15 bg-paper px-3 py-2 text-lg leading-relaxed"
      />
      <label className="flex items-center gap-2 font-sans text-sm text-bark">
        <input type="checkbox" name="publish" value="1" />
        Send it out
      </label>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the draft
      </button>
    </form>
  );
}

export function ChecklistToggle({ kind, done }: { kind: string; done: boolean }) {
  const router = useRouter();
  async function toggle() {
    await fetch("/api/research/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, done: !done }),
    });
    router.refresh();
  }
  return (
    <button
      type="button"
      data-testid={`checklist-${kind}`}
      className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm"
      onClick={toggle}
    >
      {done ? "Mark still open" : "Mark found"}
    </button>
  );
}

export function PreferMottoButton({ mottoId }: { mottoId: string }) {
  const router = useRouter();
  async function prefer() {
    await fetch("/api/mottos/prefer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mottoId }),
    });
    router.refresh();
  }
  return (
    <button type="button" className="font-sans text-sm text-seal" onClick={prefer} data-testid={`prefer-motto-${mottoId}`}>
      Show on the home
    </button>
  );
}
