import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { photographedCounts } from "@/lib/moreFamily";

export default async function PhotographedPage() {
  const ctx = await requireFamily();
  const [people, tags] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.personTag.findMany({
      where: { person: { familyId: ctx.family.id }, asset: { deletedAt: null } },
    }),
  ]);
  const rows = photographedCounts(people, tags);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="photographed-heading">Most photographed</h1>
      <p className="mt-3 max-w-2xl text-bark">Who appears in the most pictures and films.</p>
      <ul className="mt-10 space-y-3" data-testid="photographed-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card flex flex-wrap items-baseline justify-between gap-3 p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
            <span className="font-sans text-sm text-gold">{row.photos} {row.photos === 1 ? "picture" : "pictures"}</span>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
