import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ReunionForm } from "@/app/reunions/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function ReunionsPage() {
  const ctx = await requireFamily();
  const [people, reunions] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.reunionGathering.findMany({
      where: { familyId: ctx.family.id },
      include: { guests: { include: { person: true } } },
      orderBy: { happenedOn: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="reunions-heading">Reunions</h1>
      <p className="mt-3 max-w-2xl text-bark">Date, place, and who’s coming.</p>
      {canWrite(ctx.role) ? (
        <ReunionForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="reunions-list">
        {reunions.map((reunion) => (
          <li key={reunion.id} className="paper-card p-5">
            <Link href={`/reunions/${reunion.id}`} className="font-display text-2xl text-seal">{reunion.title}</Link>
            <p className="text-bark">
              {formatDate(reunion.happenedOn)} · {reunion.place}
            </p>
            <p className="mt-2 font-sans text-sm text-bark">
              {reunion.guests.filter((guest) => guest.coming).map((guest) => guest.person.displayName).join(", ") || "No one listed yet"}
            </p>
          </li>
        ))}
        {!reunions.length ? <li className="text-bark">No reunions yet.</li> : null}
      </ul>
    </AppShell>
  );
}
