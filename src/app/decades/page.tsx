import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { familyHistory } from "@/lib/timeline";
import { groupByDecade } from "@/lib/decades";
import { formatDate } from "@/lib/dates";

export default async function DecadesPage() {
  const ctx = await requireFamily();
  const history = await familyHistory(ctx.family.id, ctx.role);
  const groups = groupByDecade(history.entries.map((entry) => ({ ...entry, happenedOn: entry.happenedOn })));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="decades-heading">By decade</h1>
      <p className="mt-3 max-w-2xl text-bark">The same history, folded into the years a relative remembers.</p>
      <div className="mt-10 space-y-10" data-testid="decades-list">
        {groups.map(([decade, entries]) => (
          <section key={String(decade)}>
            <h2 className="font-display text-3xl">{decade === "undated" ? "Undated" : `${decade}s`}</h2>
            <ul className="mt-4 space-y-2">
              {entries.slice(0, 12).map((entry) => (
                <li key={entry.id} className="paper-card p-4">
                  <Link href={entry.href} className="font-display text-xl text-seal">{entry.title}</Link>
                  <p className="font-sans text-sm text-bark">{formatDate(entry.happenedOn, "Undated")}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length ? <p className="text-bark">Nothing dated yet.</p> : null}
      </div>
    </AppShell>
  );
}
