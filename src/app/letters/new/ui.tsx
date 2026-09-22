"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LetterForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function runOcr() {
    if (!file) return;
    setOcrBusy(true);
    const data = new FormData();
    data.set("file", file);
    const response = await fetch("/api/ocr", { method: "POST", body: data });
    const payload = await response.json();
    setOcrBusy(false);
    if (!response.ok) {
      setError(payload.error);
      return;
    }
    setTranscript(payload.text);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    if (file) data.set("file", file);
    data.set("transcript", transcript);
    data.set("personIds", data.getAll("personIds").map(String).join(","));
    const response = await fetch("/api/letters", { method: "POST", body: data });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error);
      return;
    }
    router.push(`/letters/${payload.document.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 space-y-4 p-6">
      <input name="title" required placeholder="Title" className="w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="font-sans text-sm">
          Written
          <input name="writtenAt" type="date" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        </label>
        <label className="font-sans text-sm">
          Kind
          <select name="kind" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2">
            <option value="letter">Letter</option>
            <option value="note">Note</option>
            <option value="clipping">Newspaper clipping</option>
            <option value="recipe">Recipe</option>
            <option value="obituary">Obituary</option>
            <option value="will">Will</option>
          </select>
        </label>
      </div>
      <input type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <button type="button" onClick={runOcr} disabled={!file || ocrBusy} className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm">
        {ocrBusy ? "Reading scan…" : "OCR this scan"}
      </button>
      <textarea
        value={transcript}
        onChange={(event) => setTranscript(event.target.value)}
        rows={10}
        placeholder="Editable transcript"
        className="w-full rounded-lg border border-bark/15 bg-paper px-3 py-2"
      />
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">Linked people</legend>
        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <label key={person.id} className="rounded-full border border-bark/15 px-3 py-1">
              <input type="checkbox" name="personIds" value={person.id} className="mr-2" />
              {person.displayName}
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button disabled={busy} className="rounded-full bg-seal px-5 py-2 font-sans text-sm text-cream" type="submit">
        {busy ? "Saving…" : "Save letter"}
      </button>
    </form>
  );
}
