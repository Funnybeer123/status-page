import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingShowsHeading } from "@/lib/medicineShow";

export default async function MissingShowsPage() {
  const ctx = await requireFamily();
  const count = await prisma.medicineShowBuy.count({ where: { familyId: ctx.family.id } });
  const missing = count ? 0 : 1;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-shows-heading">
        {missingShowsHeading(missing)}
      </h1>
      <p className="mt-6 text-bark">{missingShowsHeading(missing)}</p>
    </AppShell>
  );
}
