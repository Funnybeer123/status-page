import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingMidwivesHeading } from "@/lib/midwife";

export default async function MissingMidwivesPage() {
  const ctx = await requireFamily();
  const count = await prisma.midwifeRecord.count({ where: { familyId: ctx.family.id } });
  const missing = count ? 0 : 1;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-midwives-heading">
        {missingMidwivesHeading(missing)}
      </h1>
      <p className="mt-6 text-bark">{missingMidwivesHeading(missing)}</p>
    </AppShell>
  );
}
