import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails, hideResidenceForViewer } from "@/lib/privacy";
import { missingResidencesHeading } from "@/lib/residenceMap";

export default async function MissingResidencesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    include: { residences: true },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter(
    (person) =>
      !hideMinorDetails(ctx.role, person) &&
      !hideResidenceForViewer(ctx.role, person) &&
      !person.residences.length,
  );
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-residences-heading">{missingResidencesHeading(missing.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="missing-residences">
        {missing.map((person) => (
          <li key={person.id}>
            <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
