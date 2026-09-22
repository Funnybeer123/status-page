import { AppShell } from "@/components/AppShell";
import { QuietToggle } from "@/app/card/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { quietSettingsHeading } from "@/lib/quietMode";

export default async function QuietPage() {
  const ctx = await requireFamily();
  const user = await prisma.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { quietMode: true },
  });
  const on = Boolean(user?.quietMode);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="quiet-heading">{quietSettingsHeading(on)}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Quiet mode hides activity counts and leaves only the tree and Ask on the family home.
      </p>
      <QuietToggle quiet={on} />
    </AppShell>
  );
}
