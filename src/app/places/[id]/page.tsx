import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { placeLabel } from "@/lib/places";
import { hideResidenceForViewer } from "@/lib/privacy";

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const place = await prisma.place.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      residences: { include: { person: true } },
      events: { include: { person: true } },
    },
  });
  if (!place) notFound();
  const residences = place.residences.filter((item) => !hideResidenceForViewer(ctx.role, item.person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Place</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="place-heading">{placeLabel(place)}</h1>
      {place.latitude != null && place.longitude != null ? (
        <p className="mt-2 font-sans text-sm text-bark">
          {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
        </p>
      ) : null}
      <section className="mt-10">
        <h2 className="font-display text-2xl">Who lived here</h2>
        <ul className="mt-4 space-y-3" data-testid="place-people">
          {residences.map((item) => (
            <li key={item.id} className="paper-card p-4">
              <Link href={`/people/${item.person.id}`} className="font-display text-xl text-seal">{item.person.displayName}</Link>
              <p className="font-sans text-sm text-bark">
                {formatDate(item.startedAt, "")}
                {item.endedAt ? ` – ${formatDate(item.endedAt)}` : item.startedAt ? " – " : ""}
              </p>
              {item.notes ? <p className="text-bark">{item.notes}</p> : null}
            </li>
          ))}
          {!residences.length ? <li className="text-bark">No residences recorded.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Dated events</h2>
        <ul className="mt-4 space-y-3">
          {place.events.map((event) => (
            <li key={event.id} className="paper-card p-4">
              <p className="font-sans text-xs uppercase tracking-wide text-gold">{event.kind}</p>
              <Link href={`/people/${event.person.id}`} className="font-display text-xl text-seal">{event.title}</Link>
              <p className="font-sans text-sm text-bark">{formatDate(event.happenedOn, "Date unknown")}</p>
            </li>
          ))}
          {!place.events.length ? <li className="text-bark">None yet.</li> : null}
        </ul>
      </section>
      <p className="mt-8 font-sans text-sm">
        <Link href="/places" className="text-seal">All places</Link>
        {" · "}
        <Link href="/map" className="text-seal">Map</Link>
      </p>
    </AppShell>
  );
}
