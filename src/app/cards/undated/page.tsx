import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hasCardDates, undatedCardsHeading } from "@/lib/indexCard";
import { hideMinorDetails } from "@/lib/privacy";

export default async function UndatedCardsPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter((person) => !hideMinorDetails(ctx.role, person) && !hasCardDates(person));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="undated-cards-heading">{undatedCardsHeading(missing.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="undated-cards">
        {missing.map((person) => (
          <li key={person.id}>
            <Link href={`/people/${person.id}/card`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
