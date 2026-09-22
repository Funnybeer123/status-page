import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { longevityRows } from "@/lib/moreFamily";
import { formatDate } from "@/lib/dates";

export default async function LongevityPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } });
  const rows = longevityRows(people);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="longevity-heading">Age at death</h1>
      <p className="mt-3 max-w-2xl text-bark">How long each recorded life lasted, longest first.</p>
      <ul className="mt-10 space-y-3" data-testid="longevity-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card flex flex-wrap items-baseline justify-between gap-3 p-5">
            <div>
              <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
              <p className="font-sans text-sm text-bark">
                {formatDate(row.birthDate)} – {formatDate(row.deathDate)}
              </p>
            </div>
            <span className="font-sans text-sm text-gold">{row.years} years</span>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">No complete lifespans yet.</li> : null}
      </ul>
    </AppShell>
  );
}
