import { AppShell } from "@/components/AppShell";
import { QuietToggle } from "@/app/card/ui";
import { NightToggle } from "@/app/firsts/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { quietSettingsHeading } from "@/lib/quietMode";
import { nightSettingsHeading } from "@/lib/nightMode";

export default async function QuietPage() {
  const ctx = await requireFamily();
  const user = await prisma.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { quietMode: true, nightMode: true },
  });
  const on = Boolean(user?.quietMode);
  const night = Boolean(user?.nightMode);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="quiet-heading">{quietSettingsHeading(on)}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Quiet mode hides activity counts and leaves only the tree and Ask on the family home.
      </p>
      <QuietToggle quiet={on} />
      <p className="mt-8 font-sans text-sm text-gold">{nightSettingsHeading(night)}</p>
      <NightToggle night={night} />
    </AppShell>
  );
}
