import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { ConfirmationForm, ConfirmationPupilForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileConfirmands, confirmationHeading, confirmationLine, confirmationsHeading } from "@/lib/confirmationClass";

export default async function ConfirmationsPage() {
  const ctx = await requireFamily();
  const [classes, people] = await Promise.all([
    prisma.confirmationClass.findMany({
      where: { familyId: ctx.family.id },
      include: { pupils: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = [...classes].sort((a, b) => String(a.year).localeCompare(String(b.year)) || a.church.localeCompare(b.church));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="confirmations-heading">
        {confirmationsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The confirmation-class roll for one year, separate from school classes.{" "}
        <Link href="/classes" className="text-seal">School class lists</Link>
        {" · "}
        <Link href="/confirmations/missing" className="text-seal">Classes still needing a roll</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <ConfirmationForm />
          <ConfirmationPupilForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            classes={compiled.map((row) => ({ id: row.id, label: confirmationHeading(row.church, row.year, row.pupils.length) }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="confirmations-list">
        {compiled.map((row) => {
          const pupils = compileConfirmands(
            row.pupils.map((pupil) => ({
              id: `${pupil.classId}:${pupil.personId}`,
              person: pupil.person.displayName,
              personId: pupil.personId,
            })),
          );
          return (
            <li key={row.id} className="paper-card p-8">
              <Link href={`/confirmations/${row.id}`} className="font-display text-3xl text-seal">
                {confirmationHeading(row.church, row.year, pupils.length)}
              </Link>
              <ol className="mt-4 space-y-2" data-testid="confirmation-roll">
                {pupils.map((pupil) => (
                  <li key={pupil.id} className="text-bark">{confirmationLine(pupil.person, row.church, row.year)}</li>
                ))}
              </ol>
            </li>
          );
        })}
        {!compiled.length ? <li className="text-bark">{confirmationsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={confirmationsHeading(compiled.length)} path="/confirmations" />
    </AppShell>
  );
}
