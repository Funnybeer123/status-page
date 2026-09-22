import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingHuskingHeading } from "@/lib/huskingBee";

export default async function MissingHuskingPage() {
  const ctx = await requireFamily();
  const bees = await prisma.huskingBee.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: true, owner: true },
  });
  const missing = bees.filter((bee) => !bee.guests.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-husking-heading">
        {missingHuskingHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-husking-list">
        {missing.map((bee) => (
          <li key={bee.id} className="paper-card p-5">
            <Link href={`/husking/${bee.id}`} className="font-display text-2xl text-seal">
              {bee.owner.displayName}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingHuskingHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
