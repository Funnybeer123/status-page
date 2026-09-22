import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ButcheringWorkerForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { butcherJobLine, butcheringHeading, compileButcheringCrew } from "@/lib/butchering";

export default async function ButcheringCrewPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [crew, people] = await Promise.all([
    prisma.butcheringCrew.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { workers: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!crew) notFound();
  const workers = compileButcheringCrew(
    crew.workers.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      personId: row.personId,
      job: row.job,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Hog-butchering</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="butchering-crew-heading">
        {butcheringHeading(crew.title, workers.length)}
      </h1>
      {crew.place ? <p className="mt-3 text-bark">{crew.place}</p> : null}
      {canWrite(ctx.role) ? (
        <ButcheringWorkerForm
          crewId={crew.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="butchering-roll">
        {workers.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">
              {butcherJobLine(row.person, row.job)}
            </Link>
          </li>
        ))}
        {!workers.length ? <li className="text-bark">{butcheringHeading(crew.title, 0)}</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/butchering" className="text-seal">All hog-butchering crews</Link>
      </p>
    </AppShell>
  );
}
