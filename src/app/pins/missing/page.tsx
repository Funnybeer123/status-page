import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingPinsHeading } from "@/lib/sundaySchoolPin";

export default async function MissingPinsPage() {
  const ctx = await requireFamily();
  const count = await prisma.sundaySchoolPin.count({ where: { familyId: ctx.family.id } });
  const missing = count ? 0 : 1;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-pins-heading">
        {missingPinsHeading(missing)}
      </h1>
      <p className="mt-6 text-bark">{missingPinsHeading(missing)}</p>
    </AppShell>
  );
}
