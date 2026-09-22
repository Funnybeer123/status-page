"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LetterEditor({
  id,
  title,
  transcript,
  translation,
  writtenAt,
  needsReview,
  canEdit,
  locked = false,
  credit = "",
}: {
  id: string;
  title: string;
  transcript: string;
  translation: string;
  writtenAt: string;
  needsReview: boolean;
  canEdit: boolean;
  locked?: boolean;
  credit?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(transcript);
  const [heading, setHeading] = useState(title);
  const [date, setDate] = useState(writtenAt);
  const [rendered, setRendered] = useState(translation);
  const [review, setReview] = useState(needsReview);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  async function save(lock?: boolean) {
    const response = await fetch(`/api/letters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: heading,
        transcript: text,
        translation: rendered,
        writtenAt: date,
        needsReview: review,
        ...(lock === undefined ? {} : { lock }),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setSaved(lock ? "Finished and locked." : "Saved.");
      setError("");
      router.refresh();
      return;
    }
    setError(payload.error || "Could not save that transcript.");
  }

  return (
    <div className="paper-card p-5">
      {canEdit ? (
        <>
          <input value={heading} onChange={(e) => setHeading(e.target.value)} className="w-full border-b border-bark/15 bg-transparent pb-2 font-display text-2xl outline-none" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-3 font-sans text-sm" />
        </>
      ) : (
        <h2 className="font-display text-2xl">{heading}</h2>
      )}
      <p className="mt-4 font-sans text-xs uppercase tracking-[0.2em] text-gold">Original</p>
      <p className="mt-2 font-sans text-sm text-gold" data-testid="transcript-credit">
        {credit || (locked ? "This transcript is finished and locked" : "")}
      </p>
      <textarea
        readOnly={!canEdit || locked}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="mt-2 w-full resize-y bg-transparent text-lg leading-relaxed outline-none"
        data-testid="letter-transcript"
      />
      <p className="mt-4 font-sans text-xs uppercase tracking-[0.2em] text-gold">Translation</p>
      <textarea
        readOnly={!canEdit}
        value={rendered}
        onChange={(e) => setRendered(e.target.value)}
        rows={8}
        placeholder="Keep a translation beside the original"
        className="mt-2 w-full resize-y bg-transparent text-lg leading-relaxed outline-none"
        data-testid="letter-translation"
      />
      {canEdit ? (
        <label className="mt-4 flex items-center gap-2 font-sans text-sm">
          <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} />
          Needs a human to check the transcript
        </label>
      ) : null}
      {canEdit ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => save()} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" disabled={locked}>
            Save transcript
          </button>
          <button
            type="button"
            onClick={() => save(!locked)}
            className="rounded-full border border-bark/20 px-4 py-2 font-sans text-sm"
            data-testid="lock-transcript"
          >
            {locked ? "Unlock transcript" : "Lock this transcript"}
          </button>
          <span className="font-sans text-sm text-moss">{saved}</span>
        </div>
      ) : null}
      {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
    </div>
  );
}
