import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileDescendantReport } from "@/lib/descendantReport";

export default async function DescendantReportPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [person, people, relationships] = await Promise.all([
    prisma.person.findFirst({ where: { id, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  if (!person) notFound();
  const lines = compileDescendantReport(person.id, people, relationships);
  return (
    <AppShell>
      <div className="print:hidden">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Printable descendant report</p>
        <h1 className="mt-2 font-display text-4xl" data-testid="descendant-report-heading">{person.displayName}</h1>
        <p className="mt-3 max-w-2xl text-bark">Children and grandchildren in generation order, with spouses.</p>
      </div>
      <ol className="mt-10 space-y-2" data-testid="descendant-report">
        {lines.map((line) => (
          <li key={`${line.id}-${line.generation}`} style={{ marginLeft: `${line.generation * 1.5}rem` }} className="paper-card p-4">
            <Link href={`/people/${line.id}`} className="font-display text-xl text-seal">{line.name}</Link>
            {line.dates ? <span className="ml-2 font-sans text-sm text-gold">{line.dates}</span> : null}
            {line.spouses ? <p className="text-bark">m. {line.spouses}</p> : null}
          </li>
        ))}
        {!lines.length ? <li className="text-bark">No descendants recorded.</li> : null}
      </ol>
      <p className="mt-8 print:hidden font-sans text-sm">
        <Link href={`/group-sheets/${person.id}`} className="text-seal">Group sheet</Link>
        {" · "}
        <Link href={`/people/${person.id}/descendants`} className="text-seal">Chart</Link>
      </p>
    </AppShell>
  );
}
