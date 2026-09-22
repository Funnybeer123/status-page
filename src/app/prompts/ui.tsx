"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PromptForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: data.get("title"), body: data.get("body") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that prompt.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="prompt-form">
      <input name="title" required placeholder="How did they keep Sunday dinner?" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea name="body" rows={2} placeholder="What a relative should still say out loud" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Ask the family
      </button>
    </form>
  );
}

export function PromptAnswer({ promptId }: { promptId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("promptId", promptId);
    const file = data.get("file");
    const spokenOnly = file instanceof File && file.size > 0;
    if (!String(data.get("body") || "").trim() && !spokenOnly) {
      setError("Write it down or record a spoken answer.");
      return;
    }
    const response = await fetch("/api/prompts/answers", { method: "POST", body: data });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that answer.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3" data-testid="prompt-answer">
      <textarea name="body" rows={3} placeholder="In your own words, or leave blank and speak it" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <label className="font-sans text-sm text-bark">
        Spoken answer
        <input name="file" type="file" accept="audio/*" className="mt-1 block w-full" data-testid="prompt-audio" />
      </label>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full border border-bark/20 px-4 py-2 font-sans text-sm" type="submit">
        Answer
      </button>
    </form>
  );
}
