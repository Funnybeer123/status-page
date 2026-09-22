import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { BarnCrewForm, BarnForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { barnJobLine, barnRaisingHeading, barnRaisingsHeading, compileBarnCrew, compileBarns } from "@/lib/barnRaising";

export default async function BarnsPage() {
  const ctx = await requireFamily();
  const [barns, people] = await Promise.all([
    prisma.barnRaising.findMany({
      where: { familyId: ctx.family.id },
      include: { crew: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileBarns(barns);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="barns-heading">
        {barnRaisingsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The barn-raising crew, and each person’s job.{" "}
        <Link href="/barns/missing" className="text-seal">Raisings still needing a crew</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <BarnForm />
          <BarnCrewForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            barns={compiled.map((barn) => ({ id: barn.id, title: barn.title }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="barns-list">
        {compiled.map((barn) => {
          const crew = compileBarnCrew(
            barn.crew.map((row) => ({
              id: row.id,
              person: row.person.displayName,
              personId: row.personId,
              job: row.job,
            })),
          );
          return (
            <li key={barn.id} className="paper-card p-8">
              <Link href={`/barns/${barn.id}`} className="font-display text-3xl text-seal">
                {barnRaisingHeading(barn.title, crew.length)}
              </Link>
              <ol className="mt-4 space-y-2" data-testid="barn-crew">
                {crew.map((row) => (
                  <li key={row.id} className="text-bark">{barnJobLine(row.person, row.job)}</li>
                ))}
              </ol>
            </li>
          );
        })}
        {!compiled.length ? <li className="text-bark">{barnRaisingsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={barnRaisingsHeading(compiled.length)} path="/barns" />
    </AppShell>
  );
}
