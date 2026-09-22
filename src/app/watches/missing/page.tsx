import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isLiving } from "@/lib/privacy";
import { missingWatchesHeading } from "@/lib/deathwatch";

export default async function MissingWatchesPage() {
  const ctx = await requireFamily();
  const [people, watches] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, deathDate: { not: null } },
      orderBy: { displayName: "asc" },
    }),
    prisma.deathwatch.findMany({ where: { familyId: ctx.family.id }, select: { deceasedId: true } }),
  ]);
  const covered = new Set(watches.map((row) => row.deceasedId));
  const missing = people.filter((person) => !isLiving(person) && !covered.has(person.id));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-watches-heading">
        {missingWatchesHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-watches-list">
        {missing.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}/funeral`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingWatchesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
