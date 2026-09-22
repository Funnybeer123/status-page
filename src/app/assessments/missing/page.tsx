import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingAssessmentsHeading } from "@/lib/insurance";

export default async function MissingAssessmentsPage() {
  const ctx = await requireFamily();
  const rows = await prisma.insuranceAssessment.findMany({
    where: { familyId: ctx.family.id },
    include: { members: true },
  });
  const missing = rows.filter((row) => !row.members.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-assessments-heading">
        {missingAssessmentsHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-assessments-list">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/assessments/${row.id}`} className="font-display text-2xl text-seal">
              {row.company}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingAssessmentsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
