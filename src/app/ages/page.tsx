import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileAgesAtDeath } from "@/lib/ageAtDeath";

export default async function AgesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } });
  const rows = compileAgesAtDeath(people);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="ages-heading">Age at death</h1>
      <p className="mt-3 max-w-2xl text-bark">How long each recorded life lasted.</p>
      <ul className="mt-10 space-y-3" data-testid="ages-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.name}</Link>
            <p className="text-bark">{row.dates}{row.age != null ? ` · ${row.age} years` : ""}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">No completed lives recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
