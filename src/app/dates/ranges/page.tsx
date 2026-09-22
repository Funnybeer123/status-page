import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { dateRange, rangeBarStyle } from "@/lib/dateRange";
import { hideEventFromViewer } from "@/lib/privacy";

export default async function DateRangesPage() {
  const ctx = await requireFamily();
  const events = await prisma.lifeEvent.findMany({
    where: {
      familyId: ctx.family.id,
      OR: [{ precision: { not: "exact" } }, { rangeEnd: { not: null } }],
    },
    include: { person: true, place: true },
    orderBy: { happenedOn: "asc" },
  });
  const visible = events.filter((event) => !hideEventFromViewer(ctx.role, event));
  const years = visible
    .flatMap((event) => [event.happenedOn, event.rangeEnd])
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getUTCFullYear());
  const windowStart = years.length ? Math.min(...years) - 2 : 1900;
  const windowEnd = years.length ? Math.max(...years) + 2 : 2030;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="date-ranges-heading">Approximate dates</h1>
      <p className="mt-3 max-w-2xl text-bark">About, before, after, or a span of years — drawn as a range, not a single day.</p>
      <ul className="mt-10 space-y-4" data-testid="date-ranges-list">
        {visible.map((event) => {
          const range = dateRange(event.happenedOn, event.precision, event.rangeEnd);
          const bar = rangeBarStyle(range, windowStart, windowEnd);
          return (
            <li key={event.id} className="paper-card p-5">
              <Link href={`/people/${event.personId}`} className="font-display text-2xl text-seal">{event.title}</Link>
              <p className="font-sans text-sm text-gold">{event.person.displayName}</p>
              <p className="mt-1 text-bark" data-testid="date-range-label">{range.label}</p>
              <div className="relative mt-3 h-3 w-full bg-bark/10">
                <div className="absolute h-3 bg-gold/70" style={bar} data-testid="date-range-bar" />
              </div>
            </li>
          );
        })}
        {!visible.length ? <li className="text-bark">No approximate dates yet.</li> : null}
      </ul>
    </AppShell>
  );
}
