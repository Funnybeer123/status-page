import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { generationDepth } from "@/lib/generationDepth";
import { hideMinorDetails } from "@/lib/privacy";

export default async function GenerationsPage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const chart = generationDepth(
    visible.map((person) => ({ ...person, profileUrl: null })),
    relationships,
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="generations-heading">{chart.heading}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        How many people sit at each generation.{" "}
        <Link href="/tree" className="text-seal">The tree</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="generations-chart">
        {chart.rows.map((row) => (
          <li key={row.generation} className="paper-card p-5">
            <p className="font-display text-2xl">{row.label}</p>
            <p className="mt-2 text-bark">{row.people.map((person) => person.displayName).join(" · ")}</p>
            <div className="mt-3 h-3 rounded-full bg-bark/10">
              <div className="h-3 rounded-full bg-seal" style={{ width: `${Math.min(100, row.count * 18)}%` }} />
            </div>
          </li>
        ))}
        {!chart.rows.length ? <li className="text-bark">Add people and parents to see the depth chart.</li> : null}
      </ul>
    </AppShell>
  );
}
