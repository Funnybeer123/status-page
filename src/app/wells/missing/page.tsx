import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingWellsHeading } from "@/lib/wellRecord";

export default async function MissingWellsPage() {
  const ctx = await requireFamily();
  const count = await prisma.wellRecord.count({ where: { familyId: ctx.family.id } });
  const missing = count ? 0 : 1;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-wells-heading">
        {missingWellsHeading(missing)}
      </h1>
      <p className="mt-6 text-bark">{missingWellsHeading(missing)}</p>
    </AppShell>
  );
}
