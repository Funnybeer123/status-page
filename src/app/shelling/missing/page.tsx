import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingShellingHeading } from "@/lib/shellingBee";

export default async function MissingShellingPage() {
  const ctx = await requireFamily();
  const bees = await prisma.shellingBee.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: true, owner: true },
  });
  const missing = bees.filter((bee) => !bee.guests.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-shelling-heading">
        {missingShellingHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-shelling-list">
        {missing.map((bee) => (
          <li key={bee.id} className="paper-card p-5">
            <Link href={`/shelling/${bee.id}`} className="font-display text-2xl text-seal">
              {bee.owner.displayName}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingShellingHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
