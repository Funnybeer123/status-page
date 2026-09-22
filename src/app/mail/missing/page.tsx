import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingMailHeading } from "@/lib/ruralMail";

export default async function MissingMailPage() {
  const ctx = await requireFamily();
  const count = await prisma.ruralMailBox.count({
    where: { route: { familyId: ctx.family.id } },
  });
  const missing = count ? 0 : 1;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-mail-heading">
        {missingMailHeading(missing)}
      </h1>
      <p className="mt-6 text-bark">{missingMailHeading(missing)}</p>
    </AppShell>
  );
}
