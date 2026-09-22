import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { HuskingGuestForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileHuskingGuests, huskingBeeHeading, huskingGuestLine } from "@/lib/huskingBee";

export default async function HuskingBeePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [bee, people] = await Promise.all([
    prisma.huskingBee.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { owner: true, guests: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!bee) notFound();
  const guests = compileHuskingGuests(
    bee.guests.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      personId: row.personId,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Husking bee</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="husking-bee-heading">
        {huskingBeeHeading(bee.owner.displayName, guests.length)}
      </h1>
      {bee.place ? <p className="mt-3 text-bark">{bee.place}</p> : null}
      {canWrite(ctx.role) ? (
        <HuskingGuestForm
          beeId={bee.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="husking-roll">
        {guests.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">
              {huskingGuestLine(row.person)}
            </Link>
          </li>
        ))}
        {!guests.length ? <li className="text-bark">{huskingBeeHeading(bee.owner.displayName, 0)}</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/husking" className="text-seal">All husking bees</Link>
      </p>
    </AppShell>
  );
}
