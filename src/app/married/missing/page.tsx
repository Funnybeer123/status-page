import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileMissingMarried, missingMarriedHeading } from "@/lib/marriedYears";

export default async function MissingMarriedPage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      select: { id: true, displayName: true, deathDate: true },
    }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const rows = compileMissingMarried(people, relationships);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-married-heading">
        {missingMarriedHeading(rows.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-married-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.line}</p>
            <p className="text-bark">
              <Link href={`/people/${row.aId}`} className="text-seal">Open one spouse</Link>
            </p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{missingMarriedHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
