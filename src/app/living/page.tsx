import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { livingPeople } from "@/lib/moreFamily";
import { lifespan } from "@/lib/dates";

export default async function LivingPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const living = livingPeople(people);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="living-heading">Still living</h1>
      <p className="mt-3 max-w-2xl text-bark">Relatives without a death date, so a reunion invitation list is close at hand.</p>
      <ul className="mt-10 space-y-3" data-testid="living-list">
        {living.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">{person.displayName}</Link>
            <p className="font-sans text-sm text-bark">{lifespan(person.birthDate, person.deathDate) || "Living"}</p>
          </li>
        ))}
        {!living.length ? <li className="text-bark">No living people on the tree yet.</li> : null}
      </ul>
    </AppShell>
  );
}
