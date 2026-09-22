import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { unfinishedHuntsHeading } from "@/lib/huntBadge";

export default async function UnfinishedHuntsPage() {
  const ctx = await requireFamily();
  const hunts = await prisma.hunt.findMany({
    where: { familyId: ctx.family.id, finishes: { none: {} } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="unfinished-hunts-heading">{unfinishedHuntsHeading(hunts.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="unfinished-hunts">
        {hunts.map((hunt) => (
          <li key={hunt.id} className="paper-card p-5">
            <Link href={`/hunts/${hunt.id}`} className="font-display text-2xl text-seal">{hunt.title}</Link>
          </li>
        ))}
        {!hunts.length ? <li className="text-bark">Every hunt already has a finisher.</li> : null}
      </ul>
    </AppShell>
  );
}
