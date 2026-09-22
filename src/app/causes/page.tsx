import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileCauses } from "@/lib/baptisms";
import { formatDate } from "@/lib/dates";
import { alive } from "@/lib/alive";

export default async function CausesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive, causeOfDeath: { not: null } },
    orderBy: { displayName: "asc" },
  });
  const rows = compileCauses(people);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="causes-heading">Causes of death</h1>
      <p className="mt-3 max-w-2xl text-bark">What the family recorded when a life ended.</p>
      <ul className="mt-10 space-y-3" data-testid="causes-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
            <p className="text-bark">
              {row.causeOfDeath}
              {row.deathDate ? ` · ${formatDate(row.deathDate)}` : ""}
            </p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">No causes recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
