import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { ButcheringForm, ButcheringWorkerForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { butcheringsHeading, butcherJobLine, butcheringHeading, compileButchering, compileButcheringCrew } from "@/lib/butchering";

export default async function ButcheringPage() {
  const ctx = await requireFamily();
  const [crews, people] = await Promise.all([
    prisma.butcheringCrew.findMany({
      where: { familyId: ctx.family.id },
      include: { workers: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileButchering(crews);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="butchering-heading">
        {butcheringsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who came to the hog-butchering, and each person’s job.{" "}
        <Link href="/barns" className="text-seal">Barn raisings</Link>
        {" · "}
        <Link href="/butchering/missing" className="text-seal">Crews still needing a roll</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <ButcheringForm />
          <ButcheringWorkerForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            crews={compiled.map((crew) => ({ id: crew.id, title: butcheringHeading(crew.title, crew.workers.length) }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="butchering-list">
        {compiled.map((crew) => {
          const workers = compileButcheringCrew(
            crew.workers.map((row) => ({
              id: row.id,
              person: row.person.displayName,
              personId: row.personId,
              job: row.job,
            })),
          );
          return (
            <li key={crew.id} className="paper-card p-8">
              <Link href={`/butchering/${crew.id}`} className="font-display text-3xl text-seal">
                {butcheringHeading(crew.title, workers.length)}
              </Link>
              <ol className="mt-4 space-y-2" data-testid="butchering-roll">
                {workers.map((row) => (
                  <li key={row.id} className="text-bark">{butcherJobLine(row.person, row.job)}</li>
                ))}
              </ol>
            </li>
          );
        })}
        {!compiled.length ? <li className="text-bark">{butcheringsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={butcheringsHeading(compiled.length)} path="/butchering" />
    </AppShell>
  );
}
