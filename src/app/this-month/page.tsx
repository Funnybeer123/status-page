import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileMonthDates } from "@/lib/monthDates";

const labels = { birthday: "Birthday", death: "Death anniversary", wedding: "Wedding anniversary" };

export default async function ThisMonthPage() {
  const ctx = await requireFamily();
  const [people, marriages] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id, kind: "marriage" },
      select: { id: true, title: true, happenedOn: true, personId: true },
    }),
  ]);
  const rows = compileMonthDates({ people, marriages });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="this-month-heading">This month in the family</h1>
      <p className="mt-3 max-w-2xl text-bark">Birthdays, death dates, and weddings that fall in this month.</p>
      <ul className="mt-10 space-y-3" data-testid="this-month-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">{labels[row.kind]}</p>
            <Link href={row.href} className="font-display text-2xl text-seal">{row.name}</Link>
            <p className="text-bark">{row.day}{row.year ? ` · first in ${row.year}` : ""}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">Nothing recorded falls in this month.</li> : null}
      </ul>
    </AppShell>
  );
}
