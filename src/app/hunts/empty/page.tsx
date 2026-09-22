import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyHuntsHeading } from "@/lib/hunt";

export default async function EmptyHuntsPage() {
  const ctx = await requireFamily();
  const hunts = await prisma.hunt.findMany({
    where: { familyId: ctx.family.id, clues: { none: {} } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="empty-hunts-heading">{emptyHuntsHeading(hunts.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="empty-hunts-list">
        {hunts.map((hunt) => (
          <li key={hunt.id} className="paper-card p-5">
            <Link href={`/hunts/${hunt.id}`} className="font-display text-2xl text-seal">{hunt.title}</Link>
          </li>
        ))}
        {!hunts.length ? <li className="text-bark">Every hunt already has a clue.</li> : null}
      </ul>
    </AppShell>
  );
}
