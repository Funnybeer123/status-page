"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImportForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/gedcom", { method: "POST", body: new FormData(form) });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not import that file.");
      return;
    }
    setError("");
    setResult(`Imported ${payload.imported.people} people and ${payload.imported.families} families.`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="gedcom-import">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Import GEDCOM</p>
      <input type="file" name="file" accept=".ged,.gedcom,text/plain" className="font-sans text-sm" />
      <textarea name="text" rows={8} placeholder="Or paste GEDCOM here" className="rounded-lg border border-bark/15 bg-paper px-3 py-2 font-mono text-sm" data-testid="gedcom-text" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      {result ? <p className="font-sans text-sm text-bark" data-testid="gedcom-result">{result}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">Import into this family</button>
    </form>
  );
}
