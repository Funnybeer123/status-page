import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { thankYouEmpty, thankYouHeading, thankYouNote } from "@/lib/thankYou";

export default async function ThanksPage() {
  const ctx = await requireFamily();
  const last = await prisma.activity.findFirst({
    where: { familyId: ctx.family.id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const note = last
    ? thankYouNote({ actorName: last.actor.name, title: last.title, verb: last.verb })
    : thankYouEmpty();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="thanks-heading">{thankYouHeading()}</h1>
      <p className="mt-3 max-w-2xl text-bark">A note you can copy after a relative adds something.</p>
      <pre className="paper-card mt-8 whitespace-pre-wrap p-6 text-lg leading-relaxed" data-testid="thanks-note">
        {note}
      </pre>
      <p className="mt-6 font-sans text-sm">
        <Link href="/activity" className="text-seal">Activity feed</Link>
      </p>
    </AppShell>
  );
}
