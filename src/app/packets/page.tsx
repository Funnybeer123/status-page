import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { lifespan } from "@/lib/dates";

export default async function PacketsPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const rows = people.filter((person) => !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="packets-heading">Person packets</h1>
      <p className="mt-3 max-w-2xl text-bark">Download one person’s photographs, letters, and facts.</p>
      <ul className="mt-10 space-y-3" data-testid="packets-list">
        {rows.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}/packet`} className="font-display text-2xl text-seal">{person.displayName}</Link>
            <p className="font-sans text-sm text-bark">{lifespan(person.birthDate, person.deathDate)}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">Add a person first.</li> : null}
      </ul>
    </AppShell>
  );
}
