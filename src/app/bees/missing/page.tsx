import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingBeesHeading } from "@/lib/quiltingBee";

export default async function MissingBeesPage() {
  const ctx = await requireFamily();
  const bees = await prisma.quiltingBee.findMany({
    where: { familyId: ctx.family.id },
    include: { blocks: true },
  });
  const missing = bees.filter((bee) => !bee.blocks.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-bees-heading">
        {missingBeesHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-bees-list">
        {missing.map((bee) => (
          <li key={bee.id} className="paper-card p-5">
            <Link href={`/bees/${bee.id}`} className="font-display text-2xl text-seal">{bee.title}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingBeesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
