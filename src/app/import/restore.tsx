"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RestoreForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/export/restore", { method: "POST", body: new FormData(form) });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not restore that archive.");
      return;
    }
    setError("");
    setResult(`Restored ${payload.restored.people} people, ${payload.restored.documents} documents.`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="restore-form">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Restore a Family Lineage archive</p>
      <input type="file" name="file" accept="application/json,.json" className="font-sans text-sm" />
      <textarea name="text" rows={6} placeholder="Or paste the JSON export here" className="rounded-lg border border-bark/15 bg-paper px-3 py-2 font-mono text-sm" data-testid="restore-text" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      {result ? <p className="font-sans text-sm text-bark" data-testid="restore-result">{result}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Restore into this family
      </button>
    </form>
  );
}
