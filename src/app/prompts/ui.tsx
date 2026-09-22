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
    const response = await fetch("/api/prompts/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptId, body: data.get("body") }),
    });
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
      <textarea name="body" required rows={3} placeholder="In your own words" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full border border-bark/20 px-4 py-2 font-sans text-sm" type="submit">
        Answer
      </button>
    </form>
  );
}
