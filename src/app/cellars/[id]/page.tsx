import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CellarGuestForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { cellarGuestLine, cellarHeading, compileCellarGuests } from "@/lib/cycloneCellar";

export default async function CellarPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [cellar, people] = await Promise.all([
    prisma.cycloneCellar.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { guests: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!cellar) notFound();
  const guests = compileCellarGuests(
    cellar.guests.map((guest) => ({
      id: guest.id,
      person: guest.person.displayName,
      personId: guest.personId,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Cyclone cellar</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="cellar-heading">
        {cellarHeading(cellar.storm, guests.length)}
      </h1>
      {cellar.place ? <p className="mt-3 text-bark">{cellar.place}</p> : null}
      {canWrite(ctx.role) ? (
        <CellarGuestForm
          cellarId={cellar.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="cellars-roll">
        {guests.map((guest) => (
          <li key={guest.id} className="paper-card p-5">
            <Link href={`/people/${guest.personId}`} className="font-display text-2xl text-seal">
              {cellarGuestLine(guest.person)}
            </Link>
          </li>
        ))}
        {!guests.length ? <li className="text-bark">{cellarHeading(cellar.storm, 0)}</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/cellars" className="text-seal">All cyclone cellars</Link>
      </p>
    </AppShell>
  );
}
