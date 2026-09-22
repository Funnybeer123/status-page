import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { directoryRows } from "@/lib/moreFamily";
import { lifespan } from "@/lib/dates";

export default async function DirectoryPage() {
  const ctx = await requireFamily();
  const [people, memberships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.membership.findMany({
      where: { familyId: ctx.family.id, personId: { not: null } },
      include: { user: { select: { name: true } } },
    }),
  ]);
  const rows = directoryRows(
    people,
    memberships.map((item) => ({ personId: item.personId, userName: item.user.name })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="directory-heading">Family directory</h1>
      <p className="mt-3 max-w-2xl text-bark">Everyone on the tree, and who among them has said “this is me.”</p>
      <ul className="mt-10 space-y-3" data-testid="directory-list">
        {rows.map((row) => {
          const person = people.find((item) => item.id === row.id);
          return (
            <li key={row.id} className="paper-card p-5">
              <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
              <p className="font-sans text-sm text-bark">
                {person ? lifespan(person.birthDate, person.deathDate) : ""}
                {row.living ? " · living" : ""}
                {row.claimedBy ? ` · signed in as ${row.claimedBy}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
