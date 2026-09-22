import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingDistrictsHeading } from "@/lib/roadDistrict";

export default async function MissingDistrictsPage() {
  const ctx = await requireFamily();
  const count = await prisma.roadDistrict.count({ where: { familyId: ctx.family.id } });
  const missing = count ? 0 : 1;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-districts-heading">
        {missingDistrictsHeading(missing)}
      </h1>
      <p className="mt-6 text-bark">{missingDistrictsHeading(missing)}</p>
    </AppShell>
  );
}
