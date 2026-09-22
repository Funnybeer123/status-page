import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AssessmentMemberForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileInsuranceMembers, insuranceHeading, insuranceMemberLine } from "@/lib/insurance";

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [assessment, people] = await Promise.all([
    prisma.insuranceAssessment.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { members: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!assessment) notFound();
  const members = compileInsuranceMembers(
    assessment.members.map((member) => ({
      id: member.id,
      person: member.person.displayName,
      personId: member.personId,
      paid: member.paid,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Mutual insurance</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="assessment-heading">
        {insuranceHeading(assessment.company, assessment.loss, members.length)}
      </h1>
      {canWrite(ctx.role) ? (
        <AssessmentMemberForm
          assessmentId={assessment.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="assessments-roll">
        {members.map((member) => (
          <li key={member.id} className="paper-card p-5">
            <Link href={`/people/${member.personId}`} className="font-display text-2xl text-seal">
              {insuranceMemberLine(member.person, member.paid)}
            </Link>
          </li>
        ))}
        {!members.length ? <li className="text-bark">{insuranceHeading(assessment.company, assessment.loss, 0)}</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/assessments" className="text-seal">All assessments</Link>
      </p>
    </AppShell>
  );
}
