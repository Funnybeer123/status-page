import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { PallbearerForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compilePallbearers, pallbearerLine, pallbearersHeading } from "@/lib/pallbearers";

export default async function PallbearersPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.funeralPallbearer.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, deceased: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compilePallbearers(
    rows.map((row) => ({
      id: row.id,
      deceased: row.deceased.displayName,
      bearer: row.person.displayName,
      role: row.role,
      deceasedId: row.deceasedId,
      personId: row.personId,
    })),
  );
  const deceased = people.filter((person) => person.deathDate);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="pallbearers-heading">
        {pallbearersHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who carried at a funeral, and the role each person held.{" "}
        <Link href="/funerals" className="text-seal">Funeral programs</Link>
        {" · "}
        <Link href="/pallbearers/missing" className="text-seal">Funerals still needing a pallbearer</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PallbearerForm
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          deceased={deceased.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="pallbearers-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.deceasedId}/pallbearers`} className="font-display text-2xl text-seal">
              {pallbearerLine(row.bearer, row.role, row.deceased)}
            </Link>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{pallbearersHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={pallbearersHeading(compiled.length)} path="/pallbearers" />
    </AppShell>
  );
}
