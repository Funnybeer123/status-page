import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { siblingKind } from "@/lib/rels";
import { birthOrder, siblingSetsHeading } from "@/lib/birthOrder";
import { hideMinorDetails } from "@/lib/privacy";

export default async function SiblingSetsPage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const seen = new Set<string>();
  const sets: { id: string; names: string[] }[] = [];
  for (const person of people) {
    if (hideMinorDetails(ctx.role, person)) continue;
    const members = people.filter(
      (row) => !hideMinorDetails(ctx.role, row) && (row.id === person.id || siblingKind(person.id, row.id, relationships)),
    );
    if (members.length < 2) continue;
    const key = members.map((row) => row.id).sort().join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    sets.push({ id: person.id, names: birthOrder(members).map((row) => row.displayName) });
  }
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="sibling-sets-heading">{siblingSetsHeading(sets.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="sibling-sets-list">
        {sets.map((set) => (
          <li key={set.id} className="paper-card p-5">
            <Link href={`/siblings/${set.id}`} className="font-display text-2xl text-seal">{set.names.join(", ")}</Link>
          </li>
        ))}
        {!sets.length ? <li className="text-bark">Record parents and the children will line up by birth.</li> : null}
      </ul>
    </AppShell>
  );
}
