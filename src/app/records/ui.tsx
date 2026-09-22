"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = { id: string; displayName: string };
type Field =
  | { name: string; placeholder: string; type?: string; required?: boolean }
  | { name: "personId" | "childId" | "godparentId" | "holderId"; people: Person[]; label: string; required?: boolean };

export function RecordForm({
  kind,
  testId,
  fields,
  submit,
}: {
  kind: string;
  testId: string;
  fields: Field[];
  submit: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload: Record<string, string> = { kind };
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && value) payload[key] = value;
    }
    const response = await fetch("/api/family-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Could not save that record.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid={testId}>
      {fields.map((field) => {
        if ("people" in field) {
          return (
            <select key={field.name} name={field.name} required={field.required} className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
              <option value="">{field.label}</option>
              {field.people.map((person) => (
                <option key={person.id} value={person.id}>{person.displayName}</option>
              ))}
            </select>
          );
        }
        return (
          <input
            key={field.name}
            name={field.name}
            type={field.type || "text"}
            required={field.required}
            placeholder={field.placeholder}
            className="rounded-lg border border-bark/15 bg-paper px-3 py-2"
          />
        );
      })}
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        {submit}
      </button>
    </form>
  );
}
