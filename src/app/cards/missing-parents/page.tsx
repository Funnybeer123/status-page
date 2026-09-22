import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { compileIndexCard, missingParentsHeading } from "@/lib/indexCard";
import { hideMinorDetails } from "@/lib/privacy";

export default async function MissingParentsPage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const missing = visible.filter((person) => !compileIndexCard({ person, people: visible, relationships }).parents.length);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-parents-heading">{missingParentsHeading(missing.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="missing-parents">
        {missing.map((person) => (
          <li key={person.id}>
            <Link href={`/people/${person.id}/card`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
