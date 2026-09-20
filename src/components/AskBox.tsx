"use client";

import Link from "next/link";
import { useState } from "react";

type Source = {
  documentId: string;
  title: string;
  writtenAt: string | null;
  kind: string;
  excerpt: string;
};

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  mode?: string;
};

export function AskBox({ suggested }: { suggested: string }) {
  const [question, setQuestion] = useState(suggested);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    setMessages((current) => [...current, { role: "user", text }]);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Ask failed.");
      setMessages((current) => [
        ...current,
        { role: "assistant", text: payload.answer, sources: payload.sources, mode: payload.mode },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {messages.map((message, index) => (
          <article
            key={`${message.role}-${index}`}
            className={message.role === "user" ? "ml-auto max-w-2xl text-right" : "max-w-3xl"}
          >
            <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold">
              {message.role === "user" ? "You" : "From the archive"}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-lg leading-relaxed">{message.text}</p>
            {message.sources?.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {message.sources.map((source) => (
                  <Link
                    key={source.documentId}
                    href={`/letters/${source.documentId}`}
                    className="paper-card block p-4 text-left hover:border-seal/40"
                  >
                    <p className="font-sans text-xs uppercase tracking-wide text-seal">{source.kind}</p>
                    <p className="mt-1 font-display">{source.title}</p>
                    <p className="mt-1 font-sans text-xs text-bark/70">{source.writtenAt ?? "Undated"}</p>
                    <p className="mt-2 line-clamp-3 text-sm text-bark">{source.excerpt}</p>
                  </Link>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <form onSubmit={onSubmit} className="paper-card p-4">
        <label className="font-sans text-xs uppercase tracking-[0.18em] text-gold">Ask this family</label>
        <textarea
          className="mt-3 w-full resize-none bg-transparent text-lg outline-none"
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="How did grandma meet grandpa?"
          data-testid="ask-question"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="font-sans text-xs text-bark/70">Answers come from letters and notes in this family only.</p>
          <button
            type="submit"
            disabled={busy}
            data-testid="ask-submit"
            className="rounded-full bg-seal px-5 py-2 font-sans text-sm text-cream disabled:opacity-60"
          >
            {busy ? "Looking…" : "Ask"}
          </button>
        </div>
        {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
      </form>
    </div>
  );
}
