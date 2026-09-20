"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LetterEditor({
  id,
  title,
  transcript,
  writtenAt,
  canEdit,
}: {
  id: string;
  title: string;
  transcript: string;
  writtenAt: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(transcript);
  const [heading, setHeading] = useState(title);
  const [date, setDate] = useState(writtenAt);
  const [saved, setSaved] = useState("");

  async function save() {
    const response = await fetch(`/api/letters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: heading, transcript: text, writtenAt: date }),
    });
    if (response.ok) {
      setSaved("Saved.");
      router.refresh();
    }
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
      <textarea
        readOnly={!canEdit}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={18}
        className="mt-4 w-full resize-y bg-transparent text-lg leading-relaxed outline-none"
      />
      {canEdit ? (
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={save} className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream">
            Save transcript
          </button>
          <span className="font-sans text-sm text-moss">{saved}</span>
        </div>
      ) : null}
    </div>
  );
}
