import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails } from "@/lib/privacy";
import { compileMissingMiddles, missingMiddlesHeading } from "@/lib/middleNames";

export default async function MissingMiddlesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    orderBy: { displayName: "asc" },
  });
  const rows = compileMissingMiddles(people.filter((person) => !hideMinorDetails(ctx.role, person)));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-middles-heading">
        {missingMiddlesHeading(rows.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-middles-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{missingMiddlesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
