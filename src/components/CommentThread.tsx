"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Comment = { id: string; body: string; createdAt: string | Date; author: { name: string } };

export function CommentThread({
  comments,
  assetId,
  documentId,
  storyId,
  canWrite,
}: {
  comments: Comment[];
  assetId?: string;
  documentId?: string;
  storyId?: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: data.get("body"),
        assetId,
        documentId,
        storyId,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error || "Could not save that comment.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <section className="mt-10" data-testid="comment-thread">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Family comments</p>
      <ul className="mt-4 space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="paper-card p-4">
            <p className="font-sans text-sm text-gold">{comment.author.name}</p>
            <p className="mt-1 text-bark">{comment.body}</p>
          </li>
        ))}
        {!comments.length ? <li className="text-bark">No one has written on this yet.</li> : null}
      </ul>
      {canWrite ? (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <textarea name="body" required rows={3} placeholder="What the family still says" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="comment-body" />
          {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
          <button disabled={busy} className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit" data-testid="comment-submit">
            {busy ? "Saving…" : "Add a comment"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
