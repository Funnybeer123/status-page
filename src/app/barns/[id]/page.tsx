import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BarnCrewForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { barnJobLine, barnRaisingHeading, compileBarnCrew } from "@/lib/barnRaising";

export default async function BarnPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [barn, people] = await Promise.all([
    prisma.barnRaising.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { crew: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!barn) notFound();
  const crew = compileBarnCrew(
    barn.crew.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      personId: row.personId,
      job: row.job,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Barn raising</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="barn-heading">
        {barnRaisingHeading(barn.title, crew.length)}
      </h1>
      {barn.place ? <p className="mt-3 text-bark">{barn.place}</p> : null}
      {canWrite(ctx.role) ? (
        <BarnCrewForm
          raisingId={barn.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="barn-crew">
        {crew.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">
              {barnJobLine(row.person, row.job)}
            </Link>
          </li>
        ))}
        {!crew.length ? <li className="text-bark">{barnRaisingHeading(barn.title, 0)}</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/barns" className="text-seal">All barn raisings</Link>
      </p>
    </AppShell>
  );
}
