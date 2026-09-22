import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { AssessmentForm, AssessmentMemberForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { assessmentsHeading, compileAssessments, compileInsuranceMembers, insuranceHeading, insuranceMemberLine } from "@/lib/insurance";

export default async function AssessmentsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.insuranceAssessment.findMany({
      where: { familyId: ctx.family.id },
      include: { members: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileAssessments(rows);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="assessments-heading">
        {assessmentsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The company, the loss, and what each member paid.{" "}
        <Link href="/assessments/missing" className="text-seal">Assessments still needing a roll</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <AssessmentForm />
          <AssessmentMemberForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            assessments={compiled.map((row) => ({ id: row.id, title: insuranceHeading(row.company, row.loss, row.members.length) }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="assessments-list">
        {compiled.map((row) => {
          const members = compileInsuranceMembers(
            row.members.map((member) => ({
              id: member.id,
              person: member.person.displayName,
              personId: member.personId,
              paid: member.paid,
            })),
          );
          return (
            <li key={row.id} className="paper-card p-8">
              <Link href={`/assessments/${row.id}`} className="font-display text-3xl text-seal">
                {insuranceHeading(row.company, row.loss, members.length)}
              </Link>
              <ol className="mt-4 space-y-2" data-testid="assessments-roll">
                {members.map((member) => (
                  <li key={member.id} className="text-bark">{insuranceMemberLine(member.person, member.paid)}</li>
                ))}
              </ol>
            </li>
          );
        })}
        {!compiled.length ? <li className="text-bark">{assessmentsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={assessmentsHeading(compiled.length)} path="/assessments" />
    </AppShell>
  );
}
