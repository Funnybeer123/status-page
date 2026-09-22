import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProgramForm } from "@/app/register/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileProgram, programHeading, programLine } from "@/lib/reunionProgram";

export default async function ReunionProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [reunion, people] = await Promise.all([
    prisma.reunionGathering.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { programItems: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!reunion) notFound();
  const items = compileProgram(
    reunion.programItems.map((item) => ({
      id: item.id,
      title: item.title,
      startsAt: item.startsAt,
      personName: item.person?.displayName,
      notes: item.notes,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="program-heading">
        {programHeading(reunion.title, items.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The order of the day.{" "}
        <Link href={`/reunions/${reunion.id}`} className="text-seal">{reunion.title}</Link>
        {" · "}
        <Link href="/programs" className="text-seal">All programs</Link>
      </p>
      {canWrite(ctx.role) ? (
        <ProgramForm
          reunionId={reunion.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="program-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-display text-2xl">{item.title}</p>
            <p className="text-bark">{programLine(item.title, item.personName, item.startsAt)}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{programHeading(reunion.title, 0)}</li> : null}
      </ol>
    </AppShell>
  );
}
