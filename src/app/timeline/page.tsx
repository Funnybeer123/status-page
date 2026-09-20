import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { familyTimeline } from "@/lib/timeline";
import { formatDate } from "@/lib/dates";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>;
}) {
  const ctx = await requireFamily();
  const { personId } = await searchParams;
  const entries = await familyTimeline(ctx.family.id, ctx.role, personId);

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="timeline-heading">Timeline</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Births, homes, marriages, letters, and photographs in the order the family lived them.
      </p>
      <ol className="mt-10 space-y-5">
        {entries.map((entry) => (
          <li key={`${entry.source}-${entry.id}`} id={entry.source === "event" ? `event-${entry.id}` : undefined} className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <time className="font-sans text-sm text-gold">{entry.happenedOn ? formatDate(entry.happenedOn) : "Undated"}</time>
            <article className="paper-card p-5">
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
                {entry.kind}
                {entry.place ? ` · ${entry.place}` : ""}
              </p>
              <h2 className="mt-2 font-display text-2xl">
                <Link href={entry.href} className="hover:text-seal">{entry.title}</Link>
              </h2>
              {entry.summary ? <p className="mt-2 text-bark">{entry.summary}</p> : null}
              <p className="mt-3 font-sans text-sm text-bark">
                {entry.people.map((person) => person.displayName).filter((name, index, all) => all.indexOf(name) === index).join(", ")}
              </p>
            </article>
          </li>
        ))}
        {!entries.length ? <li className="text-bark">Nothing on the timeline yet. Add people, places, or a letter.</li> : null}
      </ol>
    </AppShell>
  );
}
