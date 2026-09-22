import Link from "next/link";
import { EventKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate, formatYear } from "@/lib/dates";
import { hideEventFromViewer } from "@/lib/privacy";

export default async function CensusPage() {
  const ctx = await requireFamily();
  const events = await prisma.lifeEvent.findMany({
    where: { familyId: ctx.family.id, kind: EventKind.census },
    include: { person: true, place: true },
    orderBy: { happenedOn: "asc" },
  });
  const visible = events.filter((event) => !hideEventFromViewer(ctx.role, event));
  const groups = new Map<string, typeof visible>();
  for (const event of visible) {
    const key = formatYear(event.happenedOn) || "Undated";
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="census-heading">Census households</h1>
      <p className="mt-3 max-w-2xl text-bark">Who was enumerated, grouped by the year the enumerator came.</p>
      <div className="mt-10 space-y-8" data-testid="census-list">
        {[...groups.entries()].map(([year, rows]) => (
          <section key={year}>
            <h2 className="font-display text-3xl">{year}</h2>
            <ul className="mt-4 space-y-2">
              {rows.map((event) => (
                <li key={event.id} className="paper-card p-4">
                  <Link href={`/people/${event.personId}`} className="font-display text-xl text-seal">{event.title}</Link>
                  <p className="font-sans text-sm text-bark">
                    {formatDate(event.happenedOn, "")}
                    {event.place ? ` · ${event.place.name}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!visible.length ? <p className="text-bark">No census events yet.</p> : null}
      </div>
    </AppShell>
  );
}
