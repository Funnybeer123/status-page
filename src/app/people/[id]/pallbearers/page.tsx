import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PallbearerForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compilePallbearers, funeralPallbearersHeading, pallbearerLine } from "@/lib/pallbearers";

export default async function PersonPallbearersPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [person, people] = await Promise.all([
    prisma.person.findFirst({
      where: { id, familyId: ctx.family.id, deletedAt: null },
      include: { funeralBearers: { include: { person: true, deceased: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!person) notFound();
  const compiled = compilePallbearers(
    person.funeralBearers.map((row) => ({
      id: row.id,
      deceased: row.deceased.displayName,
      bearer: row.person.displayName,
      role: row.role,
      deceasedId: row.deceasedId,
      personId: row.personId,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Pallbearers</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="funeral-pallbearers-heading">
        {funeralPallbearersHeading(person.displayName, compiled.length)}
      </h1>
      {canWrite(ctx.role) ? (
        <PallbearerForm
          people={people.map((row) => ({ id: row.id, displayName: row.displayName }))}
          deceased={[{ id: person.id, displayName: person.displayName }]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="funeral-pallbearers-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">
              {pallbearerLine(row.bearer, row.role, row.deceased)}
            </Link>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{funeralPallbearersHeading(person.displayName, 0)}</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/people/${person.id}/funeral`} className="text-seal">Funeral program</Link>
        {" · "}
        <Link href="/pallbearers" className="text-seal">All pallbearers</Link>
      </p>
    </AppShell>
  );
}
