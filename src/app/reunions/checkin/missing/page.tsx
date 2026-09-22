import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingCheckinHeading } from "@/lib/reunionCheckin";

export default async function MissingCheckinPage() {
  const ctx = await requireFamily();
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: { include: { person: true } } },
    orderBy: { happenedOn: "asc" },
  });
  const waiting = reunions.flatMap((reunion) =>
    reunion.guests
      .filter((guest) => !guest.arrived)
      .map((guest) => ({
        id: `${reunion.id}-${guest.personId}`,
        reunionId: reunion.id,
        title: reunion.title,
        name: guest.person.displayName,
      })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-checkin-heading">
        {missingCheckinHeading(waiting.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-checkin-list">
        {waiting.map((guest) => (
          <li key={guest.id} className="paper-card p-5">
            <Link href={`/reunions/${guest.reunionId}/checkin`} className="font-display text-2xl text-seal">
              {guest.name}
            </Link>
            <p className="text-bark">{guest.title}</p>
          </li>
        ))}
        {!waiting.length ? <li className="text-bark">{missingCheckinHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
