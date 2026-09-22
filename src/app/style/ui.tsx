"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StyleForm({
  nameStyle,
  dateStyle,
}: {
  nameStyle?: string | null;
  dateStyle?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/style", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameStyle: data.get("nameStyle"),
        dateStyle: data.get("dateStyle"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not save the style sheet.");
      return;
    }
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="paper-card mt-8 grid gap-3 p-5" data-testid="style-form">
      <select name="nameStyle" defaultValue={nameStyle || "display"} className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="display">The name the family uses</option>
        <option value="given-family">Given name then family name</option>
        <option value="family-given">Family name, given name</option>
      </select>
      <select name="dateStyle" defaultValue={dateStyle || "day-month-year"} className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
        <option value="day-month-year">Day month year</option>
        <option value="month-day-year">Month day, year</option>
        <option value="year-only">Year only</option>
      </select>
      {error ? <p className="font-sans text-sm text-seal">{error}</p> : null}
      <button className="w-fit rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
        Save the style sheet
      </button>
    </form>
  );
}
