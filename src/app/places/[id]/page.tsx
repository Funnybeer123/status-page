import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { placeLabel } from "@/lib/places";
import { hideEventFromViewer, hideResidenceForViewer } from "@/lib/privacy";
import { ancestorChain, descendantIds, placeBreadcrumb, placeKindLabel } from "@/lib/placeTree";

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [place, places] = await Promise.all([
    prisma.place.findFirst({
      where: { id, familyId: ctx.family.id },
      include: {
        parent: true,
        children: true,
        residences: { include: { person: true } },
        events: { include: { person: true } },
        photos: true,
      },
    }),
    prisma.place.findMany({
      where: { familyId: ctx.family.id },
      include: {
        residences: { include: { person: true } },
        events: { include: { person: true } },
      },
    }),
  ]);
  if (!place) notFound();
  const nodes = places.map((row) => ({ id: row.id, name: row.name, kind: row.kind, parentId: row.parentId }));
  const inside = descendantIds(nodes, place.id);
  const scoped = places.filter((row) => inside.has(row.id));
  const people = new Map<string, { id: string; displayName: string }>();
  const events: { id: string; title: string; personId: string; happenedOn: Date | null; placeName: string }[] = [];
  for (const row of scoped) {
    for (const item of row.residences) {
      if (!hideResidenceForViewer(ctx.role, item.person)) {
        people.set(item.person.id, { id: item.person.id, displayName: item.person.displayName });
      }
    }
    for (const event of row.events) {
      if (!hideEventFromViewer(ctx.role, event)) {
        events.push({
          id: event.id,
          title: event.title,
          personId: event.personId,
          happenedOn: event.happenedOn,
          placeName: row.name,
        });
      }
    }
  }
  const residences = place.residences.filter((item) => !hideResidenceForViewer(ctx.role, item.person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        {placeKindLabel(place.kind)}
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="place-heading">{placeLabel(place)}</h1>
      <p className="mt-2 font-sans text-sm text-gold" data-testid="place-breadcrumb">
        {placeBreadcrumb(nodes, place.id)}
      </p>
      {place.latitude != null && place.longitude != null ? (
        <p className="mt-2 font-sans text-sm text-bark">
          {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
        </p>
      ) : null}
      {ancestorChain(nodes, place.id).length > 1 ? (
        <p className="mt-4 font-sans text-sm">
          {ancestorChain(nodes, place.id)
            .slice(0, -1)
            .map((row) => (
              <span key={row.id}>
                <Link href={`/places/${row.id}`} className="text-seal">{row.name}</Link>
                {" · "}
              </span>
            ))}
          <Link href={`/places?within=${place.id}`} className="text-seal">Filter the list to this place</Link>
        </p>
      ) : (
        <p className="mt-4 font-sans text-sm">
          <Link href={`/places?within=${place.id}`} className="text-seal">Filter the list to this place</Link>
        </p>
      )}
      {place.children.length ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl">Inside this place</h2>
          <ul className="mt-4 space-y-2" data-testid="place-children">
            {place.children.map((child) => (
              <li key={child.id}>
                <Link href={`/places/${child.id}`} className="text-seal">{child.name}</Link>
                <span className="font-sans text-sm text-gold"> · {placeKindLabel(child.kind)}</span>
              </li>
            ))}
          </ul>
        </section>
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
          {[...people.values()]
            .filter((person) => !residences.some((item) => item.person.id === person.id))
            .map((person) => (
              <li key={person.id} className="paper-card p-4">
                <Link href={`/people/${person.id}`} className="font-display text-xl text-seal">{person.displayName}</Link>
                <p className="font-sans text-sm text-gold">Lived in a town inside this place</p>
              </li>
            ))}
          {!residences.length && !people.size ? <li className="text-bark">No residences recorded.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Dated events</h2>
        <ul className="mt-4 space-y-3" data-testid="place-events">
          {events.map((event) => (
            <li key={event.id} className="paper-card p-4">
              <Link href={`/people/${event.personId}`} className="font-display text-xl text-seal">{event.title}</Link>
              <p className="font-sans text-sm text-bark">
                {formatDate(event.happenedOn, "Date unknown")}
                {event.placeName !== place.name ? ` · ${event.placeName}` : ""}
              </p>
            </li>
          ))}
          {!events.length ? <li className="text-bark">None yet.</li> : null}
        </ul>
      </section>
      {place.photos.length ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl">Photographs taken here</h2>
          <ul className="mt-4 space-y-3" data-testid="place-photos">
            {place.photos.map((photo) => (
              <li key={photo.id} className="paper-card p-4">
                <Link href={`/archive/${photo.id}`} className="font-display text-xl text-seal">{photo.title || "A photograph"}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-8 font-sans text-sm">
        <Link href="/places" className="text-seal">All places</Link>
        {" · "}
        <Link href="/places/tree" className="text-seal">Place tree</Link>
        {" · "}
        <Link href="/map" className="text-seal">Map</Link>
        {" · "}
        <Link href="/map/photos" className="text-seal">Photo map</Link>
      </p>
    </AppShell>
  );
}
