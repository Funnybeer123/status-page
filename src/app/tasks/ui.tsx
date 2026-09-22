"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TaskForm({ people }: { people: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        body: data.get("body"),
        personId: data.get("personId") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save that task.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="task-form">
      <input name="title" required placeholder="Ask Lily who kept the navy hatband" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <textarea name="body" rows={3} placeholder="What to ask, and why it matters" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <select name="personId" className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">About whom</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Add a research task
      </button>
    </form>
  );
}

export function TaskDone({ id, done }: { id: string; done: boolean }) {
  const router = useRouter();
  async function toggle() {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, done: !done }),
    });
    router.refresh();
  }
  return (
    <button type="button" onClick={toggle} className="font-sans text-sm text-seal" data-testid="task-toggle">
      {done ? "Reopen" : "Mark done"}
    </button>
  );
}
