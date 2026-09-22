"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Source = {
  documentId: string;
  title: string;
  writtenAt: string | null;
  kind: string;
  excerpt: string;
  href?: string;
};

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  mode?: string;
};

export function AskBox({
  suggested,
  conversationId: initialId,
  initialMessages = [],
  saved = false,
  action = "/api/ask",
  persist = true,
}: {
  suggested: string;
  conversationId?: string;
  initialMessages?: Message[];
  saved?: boolean;
  action?: string;
  persist?: boolean;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState(initialMessages.length ? "" : suggested);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [conversationId, setConversationId] = useState(initialId || "");
  const [kept, setKept] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    setMessages((current) => [...current, { role: "user", text }]);
    setQuestion("");
    try {
      const response = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, conversationId: persist ? conversationId || undefined : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Ask failed.");
      if (persist && payload.conversationId) {
        setConversationId(payload.conversationId);
        router.replace(`/ask?conversationId=${payload.conversationId}`);
      }
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

  async function saveConversation() {
    if (!conversationId) return;
    const response = await fetch("/api/ask/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, saved: true }),
    });
    if (response.ok) {
      setKept(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 font-sans text-sm">
        <Link href="/ask" className="text-seal">New question</Link>
        <Link href="/ask/saved" className="text-seal">Saved questions</Link>
        {conversationId ? (
          <button type="button" onClick={saveConversation} className="text-seal" data-testid="ask-save">
            {kept ? "Saved" : "Save this question"}
          </button>
        ) : null}
      </div>
      <div className="space-y-4" data-testid="ask-thread">
        {messages.map((message, index) => (
          <article
            key={`${message.role}-${index}`}
            data-testid={`ask-${message.role}`}
            className={message.role === "user" ? "ml-auto max-w-2xl text-right" : "max-w-3xl"}
          >
            <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold">
              {message.role === "user" ? "You" : "From the archive"}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-lg leading-relaxed">{message.text}</p>
            {message.sources?.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="ask-sources">
                {message.sources.map((source) => (
                  <Link
                    key={source.documentId}
                    href={source.href || (source.kind === "photo" ? `/archive/${source.documentId}` : `/letters/${source.documentId}`)}
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
          <p className="font-sans text-xs text-bark/70">A follow-up stays in this conversation and still cites the letters.</p>
          <button
            type="submit"
            disabled={busy}
            data-testid="ask-submit"
            className="rounded-full bg-seal px-5 py-2 font-sans text-sm text-cream disabled:opacity-60"
          >
            {busy ? "Looking…" : messages.length ? "Ask a follow-up" : "Ask"}
          </button>
        </div>
        {error ? <p className="mt-2 font-sans text-sm text-seal">{error}</p> : null}
      </form>
    </div>
  );
}
