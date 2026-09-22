"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OcrReviewForm({ documentId, transcript }: { documentId: string; transcript: string }) {
  const router = useRouter();
  const [text, setText] = useState(transcript);
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/ocr/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, transcript: text, needsReview: false }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not mark that reviewed.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3" data-testid="ocr-review">
      <textarea value={text} onChange={(event) => setText(event.target.value)} rows={4} className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Mark checked
      </button>
    </form>
  );
}
