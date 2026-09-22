import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CompareForm } from "@/app/compare/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { familyHistory, filterHistory } from "@/lib/timeline";
import { formatDate } from "@/lib/dates";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const from = people.find((person) => person.id === params.from);
  const to = people.find((person) => person.id === params.to);
  const history = from && to ? await familyHistory(ctx.family.id, ctx.role) : null;
  const left = history && from ? filterHistory(history.entries, { personId: from.id }) : [];
  const right = history && to ? filterHistory(history.entries, { personId: to.id }) : [];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="compare-heading">Side by side</h1>
      <p className="mt-3 max-w-2xl text-bark">Two lives, the same years, so a relative can see what overlapped.</p>
      <CompareForm
        people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        fromId={from?.id}
        toId={to?.id}
      />
      {from && to ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2" data-testid="compare-columns">
          {[
            { person: from, entries: left },
            { person: to, entries: right },
          ].map(({ person, entries }) => (
            <section key={person.id}>
              <h2 className="font-display text-2xl">
                <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
              </h2>
              <ol className="mt-4 space-y-2">
                {entries.map((entry) => (
                  <li key={entry.id} className="paper-card p-4">
                    <Link href={entry.href} className="font-display text-xl text-seal">{entry.title}</Link>
                    <p className="font-sans text-sm text-bark">{formatDate(entry.happenedOn, "Undated")}</p>
                  </li>
                ))}
                {!entries.length ? <li className="text-bark">Nothing dated yet.</li> : null}
              </ol>
            </section>
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}
