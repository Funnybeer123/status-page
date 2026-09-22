import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { missingDirectoryHeading, missingDirectoryPeople } from "@/lib/yearExtras";

export default async function MissingDirectoryPage() {
  const ctx = await requireFamily();
  const [people, entries] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.cityDirectory.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const missing = missingDirectoryPeople(people, entries);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="city-directory-missing-heading">
        {missingDirectoryHeading(missing.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">People on the tree who still do not have a city-directory line.</p>
      <ul className="mt-10 space-y-3" data-testid="city-directory-missing-list">
        {missing.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">{person.displayName}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Everyone has a city-directory line.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/city-directory" className="text-seal">City directory</Link>
      </p>
    </AppShell>
  );
}
