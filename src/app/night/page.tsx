import { AppShell } from "@/components/AppShell";
import { NightToggle } from "@/app/firsts/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { nightSettingsHeading } from "@/lib/nightMode";

export default async function NightPage() {
  const ctx = await requireFamily();
  const user = await prisma.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { nightMode: true },
  });
  const on = Boolean(user?.nightMode);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="night-heading">{nightSettingsHeading(on)}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Night mode darkens the quiet view. Turn quiet mode on first if you want the evening home.
      </p>
      <NightToggle night={on} />
    </AppShell>
  );
}
