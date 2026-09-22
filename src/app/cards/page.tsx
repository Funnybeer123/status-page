import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { cardsHeading, compileIndexCard } from "@/lib/indexCard";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";

export default async function CardsPage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="cards-heading">{cardsHeading(visible.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="cards-list">
        {visible.map((person) => {
          const card = compileIndexCard({
            person,
            people: visible,
            relationships,
            hideDates: shouldHideLivingFacts(ctx.role, person),
          });
          return (
            <li key={person.id} className="paper-card p-5">
              <Link href={`/people/${person.id}/card`} className="font-display text-2xl text-seal">{card.name}</Link>
              <p className="text-bark">{card.dates}</p>
              <p className="font-sans text-sm text-gold">{card.parentLine}</p>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
