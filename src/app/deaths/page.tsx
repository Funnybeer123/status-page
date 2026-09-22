import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function DeathsPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, causeOfDeath: { not: null } },
    orderBy: { deathDate: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="deaths-heading">Cause of death</h1>
      <p className="mt-3 max-w-2xl text-bark">What the family recorded, kept with the person.</p>
      <ul className="mt-10 space-y-3" data-testid="deaths-list">
        {people.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">{person.displayName}</Link>
            <p className="text-bark">{person.causeOfDeath}</p>
            <p className="font-sans text-sm text-gold">{formatDate(person.deathDate, "")}</p>
          </li>
        ))}
        {!people.length ? <li className="text-bark">No causes recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
