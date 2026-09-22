import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { peopleWithoutFirstsHeading } from "@/lib/scrapbook";

export default async function PeopleWithoutFirstsPage() {
  const ctx = await requireFamily();
  const [people, tagged] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id, firstTag: { not: null } },
      select: { personId: true },
    }),
  ]);
  const taggedIds = new Set(tagged.map((event) => event.personId));
  const missing = people.filter((person) => !taggedIds.has(person.id) && !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="people-without-firsts-heading">
        {peopleWithoutFirstsHeading(missing.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="people-without-firsts">
        {missing.map((person) => (
          <li key={person.id}>
            <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
