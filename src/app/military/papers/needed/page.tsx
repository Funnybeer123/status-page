import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { papersNeeded, papersNeededHeading } from "@/lib/yearExtras";

export default async function PapersNeededPage() {
  const ctx = await requireFamily();
  const [services, papers] = await Promise.all([
    prisma.militaryService.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    }),
    prisma.militaryPaper.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const missing = papersNeeded(services, papers);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="papers-needed-heading">{papersNeededHeading(missing.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Service records that still lack a draft card or pension paper.</p>
      <ul className="mt-10 space-y-3" data-testid="papers-needed-list">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.person.displayName}</p>
            <p className="text-bark">{row.branch}{row.unit ? ` · ${row.unit}` : ""}</p>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every service has a draft or pension paper.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/military/papers" className="text-seal">Draft and pension papers</Link>
      </p>
    </AppShell>
  );
}
