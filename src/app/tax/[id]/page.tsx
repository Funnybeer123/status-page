import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { TaxNameForm } from "@/app/path/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileTaxNames, taxListHeading, taxNameLine } from "@/lib/taxList";

export default async function TaxListPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [list, people] = await Promise.all([
    prisma.taxList.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { names: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!list) notFound();
  const names = compileTaxNames(
    list.names.map((row) => ({
      id: row.id,
      name: row.name,
      personId: row.personId,
      amount: row.amount,
      notes: row.notes,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/tax" className="text-seal">Tax lists</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="tax-list-heading">{taxListHeading(list.place, list.year)}</h1>
      {list.notes ? <p className="mt-3 text-bark">{list.notes}</p> : null}
      {canWrite(ctx.role) ? (
        <TaxNameForm listId={list.id} people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="tax-names">
        {names.map((row) => (
          <li key={row.id} className="paper-card p-5">
            {row.personId ? (
              <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.name}</Link>
            ) : (
              <p className="font-display text-2xl">{row.name}</p>
            )}
            <p className="text-bark">{taxNameLine(row)}</p>
          </li>
        ))}
        {!names.length ? <li className="text-bark">Nobody named yet.</li> : null}
      </ul>
    </AppShell>
  );
}
