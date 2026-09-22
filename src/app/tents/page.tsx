import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { pickHomeMotto } from "@/lib/homeMotto";
import { tableTentHeading, tableTentsHeading } from "@/lib/tableTent";

export default async function TentsPage() {
  const ctx = await requireFamily();
  const [reunions, mottos] = await Promise.all([
    prisma.reunionGathering.findMany({ where: { familyId: ctx.family.id }, orderBy: { happenedOn: "asc" } }),
    prisma.familyMotto.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const motto = pickHomeMotto(mottos);
  const tents = motto ? reunions : [];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="tents-heading">
        {tableTentsHeading(tents.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/tents/missing" className="text-seal">Reunions without a tent</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="tents-list">
        {tents.map((reunion) => (
          <li key={reunion.id} className="paper-card p-5">
            <Link href={`/reunions/${reunion.id}/tent`} className="font-display text-2xl text-seal">
              {tableTentHeading(reunion.title, motto?.text)}
            </Link>
          </li>
        ))}
        {!tents.length ? <li className="text-bark">{tableTentsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
