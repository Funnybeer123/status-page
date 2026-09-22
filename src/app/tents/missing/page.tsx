import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { pickHomeMotto } from "@/lib/homeMotto";
import { missingTentHeading } from "@/lib/tableTent";

export default async function MissingTentsPage() {
  const ctx = await requireFamily();
  const [reunions, mottos] = await Promise.all([
    prisma.reunionGathering.findMany({ where: { familyId: ctx.family.id }, orderBy: { happenedOn: "asc" } }),
    prisma.familyMotto.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const motto = pickHomeMotto(mottos);
  const missing = motto ? [] : reunions;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-tents-heading">
        {missingTentHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-tents-list">
        {missing.map((reunion) => (
          <li key={reunion.id} className="paper-card p-5">
            <Link href="/mottos" className="font-display text-2xl text-seal">
              {reunion.title}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingTentHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
