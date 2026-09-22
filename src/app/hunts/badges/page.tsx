import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { huntBadgeLine, huntBadgesHeading } from "@/lib/huntBadge";

export default async function HuntBadgesPage() {
  const ctx = await requireFamily();
  const finishes = await prisma.huntFinish.findMany({
    where: { familyId: ctx.family.id },
    include: { user: { select: { name: true } }, hunt: true },
    orderBy: { finishedAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="hunt-badges-heading">{huntBadgesHeading(finishes.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="hunt-badges">
        {finishes.map((row) => (
          <li key={`${row.huntId}-${row.userId}`} className="paper-card p-5">
            <Link href={`/hunts/${row.huntId}`} className="font-display text-2xl text-seal">
              {huntBadgeLine(row.user.name || "A relative", row.hunt.title)}
            </Link>
          </li>
        ))}
        {!finishes.length ? <li className="text-bark">No one has finished a scavenger hunt yet.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/hunts/unfinished" className="text-seal">Hunts still needing a finisher</Link>
        {" · "}
        <Link href="/hunts" className="text-seal">All hunts</Link>
      </p>
    </AppShell>
  );
}
