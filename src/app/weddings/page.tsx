import Link from "next/link";
import { EventKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function WeddingsPage() {
  const ctx = await requireFamily();
  const weddings = await prisma.lifeEvent.findMany({
    where: { familyId: ctx.family.id, kind: EventKind.marriage },
    include: { person: true, otherPerson: true, place: true },
    orderBy: { happenedOn: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="weddings-heading">Weddings</h1>
      <p className="mt-3 max-w-2xl text-bark">Every recorded marriage, with the place if the archive knows it.</p>
      <ul className="mt-10 space-y-3" data-testid="weddings-list">
        {weddings.map((event) => (
          <li key={event.id} className="paper-card p-5">
            <Link href={`/people/${event.personId}`} className="font-display text-2xl text-seal">{event.title}</Link>
            <p className="font-sans text-sm text-bark">
              {formatDate(event.happenedOn, "Date unknown")}
              {event.place ? ` · ${event.place.name}` : ""}
              {event.otherPerson ? ` · ${event.otherPerson.displayName}` : ""}
            </p>
            <p className="mt-2 font-sans text-sm">
              <Link href={`/weddings/${event.id}`} className="text-seal">Wedding party</Link>
            </p>
          </li>
        ))}
        {!weddings.length ? <li className="text-bark">No marriages recorded.</li> : null}
      </ul>
    </AppShell>
  );
}
