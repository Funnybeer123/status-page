import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ConfirmationPupilForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileConfirmands, confirmationHeading, confirmationLine } from "@/lib/confirmationClass";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [row, people] = await Promise.all([
    prisma.confirmationClass.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { pupils: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!row) notFound();
  const pupils = compileConfirmands(
    row.pupils.map((pupil) => ({
      id: `${pupil.classId}:${pupil.personId}`,
      person: pupil.person.displayName,
      personId: pupil.personId,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Confirmation class</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="confirmation-heading">
        {confirmationHeading(row.church, row.year, pupils.length)}
      </h1>
      {canWrite(ctx.role) ? (
        <ConfirmationPupilForm
          classId={row.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="confirmation-roll">
        {pupils.map((pupil) => (
          <li key={pupil.id} className="paper-card p-5">
            <Link href={`/people/${pupil.personId}`} className="font-display text-2xl text-seal">
              {confirmationLine(pupil.person, row.church, row.year)}
            </Link>
          </li>
        ))}
        {!pupils.length ? <li className="text-bark">{confirmationHeading(row.church, row.year, 0)}</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/confirmations" className="text-seal">All confirmation classes</Link>
      </p>
    </AppShell>
  );
}
