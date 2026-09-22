import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingSickHeading } from "@/lib/sickWatch";

export default async function MissingSickPage() {
  const ctx = await requireFamily();
  const count = await prisma.sickWatch.count({ where: { familyId: ctx.family.id } });
  const missing = count ? 0 : 1;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-sick-heading">
        {missingSickHeading(missing)}
      </h1>
      <p className="mt-6 text-bark">{missingSickHeading(missing)}</p>
    </AppShell>
  );
}
