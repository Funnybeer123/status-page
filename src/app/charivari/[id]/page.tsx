import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CharivariGuestForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { charivariGuestLine, charivariHeading, compileCharivariGuests } from "@/lib/charivari";

export default async function OneCharivariPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [row, people] = await Promise.all([
    prisma.charivari.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { guests: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!row) notFound();
  const guests = compileCharivariGuests(
    row.guests.map((guest) => ({
      id: guest.id,
      person: guest.person.displayName,
      personId: guest.personId,
      noise: guest.noise,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Charivari</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="one-charivari-heading">
        {charivariHeading(row.title, guests.length)}
      </h1>
      {canWrite(ctx.role) ? (
        <CharivariGuestForm
          charivariId={row.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="charivari-roll">
        {guests.map((guest) => (
          <li key={guest.id} className="paper-card p-5">
            <Link href={`/people/${guest.personId}`} className="font-display text-2xl text-seal">
              {charivariGuestLine(guest.person, guest.noise)}
            </Link>
          </li>
        ))}
        {!guests.length ? <li className="text-bark">{charivariHeading(row.title, 0)}</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/charivari" className="text-seal">All charivaris</Link>
      </p>
    </AppShell>
  );
}
