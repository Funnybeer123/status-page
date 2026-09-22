"use client";

import { useRouter } from "next/navigation";

export function CompareForm({
  people,
  fromId,
  toId,
}: {
  people: { id: string; displayName: string }[];
  fromId?: string;
  toId?: string;
}) {
  const router = useRouter();
  return (
    <form
      className="paper-card mt-8 grid gap-3 p-5 sm:grid-cols-2"
      data-testid="compare-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        router.push(`/compare?from=${data.get("from")}&to=${data.get("to")}`);
      }}
    >
      <select name="from" defaultValue={fromId || ""} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">First life</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <select name="to" defaultValue={toId || ""} required className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="">Second life</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.displayName}</option>
        ))}
      </select>
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream sm:col-span-2" type="submit">
        Compare their lives
      </button>
    </form>
  );
}
