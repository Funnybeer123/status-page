import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { lifespan } from "@/lib/dates";
import { buildAhnentafel } from "@/lib/ahnentafel";
import { buildDescendants, countDescendants, flattenDescendants } from "@/lib/descendants";

const downLabels = ["This person", "Children", "Grandchildren", "Great-grandchildren", "Great-great-grandchildren"];

export default async function DescendantsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [person, people, relationships] = await Promise.all([
    prisma.person.findFirst({ where: { id, familyId: ctx.family.id } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  if (!person) notFound();
  const tree = buildDescendants(person.id, people, relationships);
  const rows = flattenDescendants(tree);
  const ahnentafel = buildAhnentafel(person.id, people, relationships);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{person.displayName}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="descendants-heading">Descendants and ancestors</h1>
      <p className="mt-3 max-w-2xl text-bark">
        {countDescendants(tree)} recorded descendants. Ahnentafel numbers walk the other direction.
      </p>
      <div className="mt-10 space-y-8" data-testid="descendants-chart">
        {rows.map(([generation, members]) => (
          <section key={generation}>
            <p className="mb-3 font-sans text-xs uppercase tracking-[0.2em] text-gold">
              {downLabels[generation] || `Generation +${generation}`}
            </p>
            <div className="flex flex-wrap gap-4">
              {members.map((member) => (
                <Link key={member.id} href={`/people/${member.id}`} className="paper-card min-w-40 px-4 py-3">
                  <p className="font-display text-xl">{member.displayName}</p>
                  <p className="font-sans text-xs text-bark">{lifespan(member.birthDate, member.deathDate)}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <section className="mt-12">
        <h2 className="font-display text-2xl">Ahnentafel</h2>
        <ol className="mt-4 space-y-2" data-testid="ahnentafel-list">
          {ahnentafel.map((row) => (
            <li key={`${row.number}-${row.person.id}`} className="paper-card flex flex-wrap items-baseline gap-3 p-4">
              <span className="font-sans text-sm text-gold">{row.number}</span>
              <Link href={`/people/${row.person.id}`} className="font-display text-xl text-seal">{row.person.displayName}</Link>
              <span className="font-sans text-sm text-bark">{lifespan(row.person.birthDate, row.person.deathDate)}</span>
            </li>
          ))}
        </ol>
      </section>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/people/${person.id}`} className="text-seal">Back to the record</Link>
        {" · "}
        <Link href={`/shared?from=${person.id}`} className="text-seal">Shared ancestors</Link>
      </p>
    </AppShell>
  );
}
