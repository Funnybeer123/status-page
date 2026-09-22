"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArchiveClient({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const selected = data.getAll("personIds").map(String);
    data.set("personIds", selected.join(","));
    const response = await fetch("/api/assets", { method: "POST", body: data });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error);
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5 md:grid-cols-2">
      <input type="file" name="file" required accept="image/*,video/*,audio/*" className="font-sans text-sm" />
      <input name="title" placeholder="Caption or oral-history title" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <label className="font-sans text-sm">
        Kind
        <select name="kind" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2">
          <option value="">Detect from the file</option>
          <option value="photo">Photograph</option>
          <option value="video">Film</option>
          <option value="audio">Oral history</option>
        </select>
      </label>
      <label className="font-sans text-sm">
        Date
        <input type="date" name="capturedAt" className="mt-1 w-full rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      </label>
      <fieldset className="font-sans text-sm">
        <legend className="mb-2">Tag people</legend>
        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <label key={person.id} className="rounded-full border border-bark/15 px-3 py-1">
              <input type="checkbox" name="personIds" value={person.id} className="mr-2" />
              {person.displayName}
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p className="font-sans text-sm text-seal md:col-span-2">{error}</p> : null}
      <button disabled={busy} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        {busy ? "Uploading…" : "Upload to the archive"}
      </button>
    </form>
  );
}
