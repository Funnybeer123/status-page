import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingShiftsHeading } from "@/lib/reunionShifts";

export default async function MissingShiftsPage() {
  const ctx = await requireFamily();
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id, shifts: { none: {} } },
    orderBy: { happenedOn: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-shifts-heading">
        {missingShiftsHeading(reunions.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-shifts-list">
        {reunions.map((reunion) => (
          <li key={reunion.id} className="paper-card p-5">
            <Link href={`/reunions/${reunion.id}/shifts`} className="font-display text-2xl text-seal">
              {reunion.title}
            </Link>
          </li>
        ))}
        {!reunions.length ? <li className="text-bark">{missingShiftsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
