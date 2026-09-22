import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RegisterLineForm } from "@/app/path/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileRegisterLines, registerHeading, registerLineText } from "@/lib/registerExtract";
import { formatDate } from "@/lib/dates";

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [register, people] = await Promise.all([
    prisma.churchRegister.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { lines: { include: { person: true, otherPerson: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!register) notFound();
  const lines = compileRegisterLines(
    register.lines.map((line) => ({
      id: line.id,
      kind: line.kind,
      happenedOn: line.happenedOn,
      text: line.text,
      personId: line.personId,
      personName: line.person?.displayName,
      otherPersonId: line.otherPersonId,
      otherPersonName: line.otherPerson?.displayName,
      notes: line.notes,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/registers" className="text-seal">Registers</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="register-heading">
        {registerHeading(register.church, lines.length)}
      </h1>
      {register.place ? <p className="mt-3 text-bark">{register.place}</p> : null}
      {canWrite(ctx.role) ? (
        <RegisterLineForm
          registerId={register.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="register-lines">
        {lines.map((line) => (
          <li key={line.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{line.kind}</p>
            <p className="mt-2 font-display text-2xl">{registerLineText(line)}</p>
            <p className="mt-1 font-sans text-sm text-bark">
              {formatDate(line.happenedOn, "")}
              {line.personId ? (
                <>
                  {" · "}
                  <Link href={`/people/${line.personId}`} className="text-seal">{line.personName}</Link>
                </>
              ) : null}
            </p>
          </li>
        ))}
        {!lines.length ? <li className="text-bark">No extract lines yet.</li> : null}
      </ul>
    </AppShell>
  );
}
