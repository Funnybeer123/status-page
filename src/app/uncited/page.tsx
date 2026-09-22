import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileUncited } from "@/lib/uncited";

export default async function UncitedPage() {
  const ctx = await requireFamily();
  const [people, citations, census] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.citation.findMany({
      where: { familyId: ctx.family.id, kind: { in: ["census", "birth", "death"] } },
      select: { personId: true, kind: true },
    }),
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id, kind: "census" },
      select: { personId: true },
    }),
  ]);
  const rows = compileUncited({
    people,
    citations,
    censusPersonIds: census.map((event) => event.personId),
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="uncited-heading">Still needs a citation</h1>
      <p className="mt-3 max-w-2xl text-bark">Births, deaths, and census rows that do not yet point at a page.</p>
      <ul className="mt-10 space-y-3" data-testid="uncited-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">{row.kind}</p>
            <p className="font-display text-2xl">{row.name}</p>
            <p className="text-bark">{row.reason}</p>
            <Link href={row.href} className="mt-2 inline-block font-sans text-sm text-seal">Open the worksheet</Link>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">Every recorded vital has a citation.</li> : null}
      </ul>
    </AppShell>
  );
}
