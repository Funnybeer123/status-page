"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PersonDetailsForm({
  personId,
  causeOfDeath,
  languages,
  burialPlot,
  pronunciation,
}: {
  personId: string;
  causeOfDeath: string;
  languages: string;
  burialPlot: string;
  pronunciation: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/people/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        causeOfDeath: data.get("causeOfDeath"),
        languages: data.get("languages"),
        burialPlot: data.get("burialPlot"),
        pronunciation: data.get("pronunciation"),
      }),
    });
    if (response.ok) {
      setSaved("Saved.");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="paper-card grid gap-3 p-5" data-testid="person-details">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Death, languages, burial, how to say the name</p>
      <input name="pronunciation" defaultValue={pronunciation} placeholder="EL-uh-nor hart" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" data-testid="pronunciation-input" />
      <input name="causeOfDeath" defaultValue={causeOfDeath} placeholder="Cause of death" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="languages" defaultValue={languages} placeholder="Languages spoken" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <input name="burialPlot" defaultValue={burialPlot} placeholder="Burial plot" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
      <div className="flex items-center gap-3">
        <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">
          Save later facts
        </button>
        <span className="font-sans text-sm text-moss">{saved}</span>
      </div>
    </form>
  );
}
