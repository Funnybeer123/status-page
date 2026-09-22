"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InterviewAnswerForm({
  personId,
  promptKey,
}: {
  personId: string;
  promptKey: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, promptKey, body: data.get("body") }),
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
    <form onSubmit={onSubmit} className="mt-3 grid gap-3" data-testid={`interview-answer-${promptKey}`}>
      <textarea name="body" required rows={3} placeholder="In their own words" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full border border-bark/20 px-4 py-2 font-sans text-sm" type="submit">
        Save as a story
      </button>
    </form>
  );
}
