import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function WitnessesPage() {
  const ctx = await requireFamily();
  const rows = await prisma.eventWitness.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, event: { include: { person: true } } },
    orderBy: { event: { happenedOn: "asc" } },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="witnesses-heading">Witnesses</h1>
      <p className="mt-3 max-w-2xl text-bark">Who stood at a wedding, a baptism, or another dated event.</p>
      <ul className="mt-10 space-y-3" data-testid="witnesses-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.person.displayName}</Link>
            <p className="text-bark">
              {row.role} at {row.event.title}
              {row.event.person ? ` for ${row.event.person.displayName}` : ""}
            </p>
            <p className="font-sans text-sm text-gold">{formatDate(row.event.happenedOn, "")}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">No witnesses recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
