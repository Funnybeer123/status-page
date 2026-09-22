import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { rsvpCardHeading, rsvpCardsHeading, rsvpWhenLine } from "@/lib/rsvpCard";

export default async function RsvpCardsPage() {
  const ctx = await requireFamily();
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: true },
    orderBy: { happenedOn: "asc" },
  });
  const items = reunions.filter((reunion) => reunion.guests.length);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="rsvp-cards-heading">{rsvpCardsHeading(items.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="rsvp-cards">
        {items.map((reunion) => (
          <li key={reunion.id} className="paper-card p-4">
            <Link href={`/reunions/${reunion.id}/rsvp-card`} className="font-display text-xl text-seal">
              {rsvpCardHeading(reunion.title)}
            </Link>
            <p className="text-bark">{rsvpWhenLine(reunion.title, reunion.happenedOn, reunion.place)}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{rsvpCardsHeading(0)}</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/reunions/rsvp/missing" className="text-seal">Reunions still without an RSVP</Link>
      </p>
    </AppShell>
  );
}
