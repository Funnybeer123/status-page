import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { listCouples } from "@/lib/groupSheet";

export default async function GroupSheetsPage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const couples = listCouples(people, relationships);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="group-sheets-heading">Family group sheets</h1>
      <p className="mt-3 max-w-2xl text-bark">Parents, spouses, and children on one printable page.</p>
      <ul className="mt-10 space-y-3" data-testid="group-sheets-list">
        {couples.map((couple) => (
          <li key={couple.id} className="paper-card p-5">
            <Link href={`/group-sheets/${couple.personId}`} className="font-display text-2xl text-seal">{couple.names}</Link>
          </li>
        ))}
        {people.filter((person) => !couples.some((couple) => couple.personId === person.id)).slice(0, 8).map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/group-sheets/${person.id}`} className="font-display text-2xl text-seal">{person.displayName}</Link>
          </li>
        ))}
        {!people.length ? <li className="text-bark">Add people first.</li> : null}
      </ul>
    </AppShell>
  );
}
