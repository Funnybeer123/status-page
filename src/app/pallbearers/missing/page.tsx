import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingPallbearersHeading } from "@/lib/pallbearers";

export default async function MissingPallbearersPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, deathDate: { not: null } },
    include: { funeralBearers: true },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter((person) => !person.funeralBearers.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-pallbearers-heading">
        {missingPallbearersHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-pallbearers-list">
        {missing.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}/pallbearers`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingPallbearersHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
