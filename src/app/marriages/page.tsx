import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileMarriageAges } from "@/lib/marriageAges";

export default async function MarriagesPage() {
  const ctx = await requireFamily();
  const [people, relationships, events] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.lifeEvent.findMany({ where: { familyId: ctx.family.id, kind: "marriage" } }),
  ]);
  const rows = compileMarriageAges(people, relationships, events);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="marriages-heading">Age at marriage</h1>
      <p className="mt-3 max-w-2xl text-bark">How old each relative was on the wedding day.</p>
      <ul className="mt-10 space-y-3" data-testid="marriages-list">
        {rows.map((row) => (
          <li key={`${row.personId}-${row.marriedOn}`} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.name}</Link>
            <p className="text-bark">
              married {row.spouseName} · {row.marriedOn}
              {row.age != null ? ` · age ${row.age}` : ""}
            </p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">No dated marriages yet.</li> : null}
      </ul>
    </AppShell>
  );
}
