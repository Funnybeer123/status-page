import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { placeLabel } from "@/lib/places";
import { hideEventFromViewer, hideResidenceForViewer } from "@/lib/privacy";
import { ancestorChain, descendantIds, placeBreadcrumb, placeKindLabel } from "@/lib/placeTree";
import { chronicleHeading, chroniclePhotosHeading, compileChronicle, placeMatch } from "@/lib/placeChronicle";
import { PlacePhotoForm } from "@/app/ask-save/ui";
import { canWrite } from "@/lib/roles";

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [place, places, homes, households, voyages, letters, stories, loosePhotos] = await Promise.all([
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
    prisma.familyHome.findMany({ where: { familyId: ctx.family.id } }),
    prisma.censusHousehold.findMany({ where: { familyId: ctx.family.id } }),
    prisma.voyage.findMany({ where: { familyId: ctx.family.id } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    }),
    prisma.story.findMany({ where: { familyId: ctx.family.id } }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo", placeId: null },
      orderBy: { title: "asc" },
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
  const chronicle = compileChronicle([
    ...residences.map((item) => ({
      id: `residence-${item.id}`,
      kind: "residence" as const,
      title: `${item.person.displayName} lived here`,
      href: `/people/${item.person.id}`,
      date: item.startedAt,
    })),
    ...events.map((event) => ({
      id: `event-${event.id}`,
      kind: "event" as const,
      title: event.title,
      href: `/people/${event.personId}`,
      date: event.happenedOn,
    })),
    ...place.photos.map((photo) => ({
      id: `photo-${photo.id}`,
      kind: "photo" as const,
      title: photo.title || "A photograph",
      href: `/archive/${photo.id}`,
      date: photo.capturedAt,
    })),
    ...homes
      .filter((home) => (home.placeId && inside.has(home.placeId)) || placeMatch(place.name, home.locality) || placeMatch(place.name, home.title))
      .map((home) => ({
        id: `home-${home.id}`,
        kind: "home" as const,
        title: home.title,
        href: `/homes/${home.id}`,
        date: null,
      })),
    ...households
      .filter((row) => placeMatch(place.name, row.place) || placeMatch(place.name, row.street))
      .map((row) => ({
        id: `census-${row.id}`,
        kind: "census" as const,
        title: `Census, ${row.place}, ${row.year}`,
        href: `/households/${row.id}`,
        date: `${row.year}-01-01`,
      })),
    ...voyages
      .filter((row) => placeMatch(place.name, row.departedFrom) || placeMatch(place.name, row.arrivedAt))
      .map((row) => ({
        id: `voyage-${row.id}`,
        kind: "voyage" as const,
        title: row.ship,
        href: `/voyages/${row.id}`,
        date: row.departedOn,
      })),
    ...letters
      .filter((row) => placeMatch(place.name, row.title) || placeMatch(place.name, row.transcript))
      .map((row) => ({
        id: `letter-${row.id}`,
        kind: "letter" as const,
        title: row.title,
        href: `/letters/${row.id}`,
        date: row.writtenAt,
      })),
    ...stories
      .filter((row) => placeMatch(place.name, row.title) || placeMatch(place.name, row.body))
      .map((row) => ({
        id: `story-${row.id}`,
        kind: "story" as const,
        title: row.title,
        href: `/stories/${row.id}`,
        date: row.recordedAt,
      })),
  ]);
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
      <section className="mt-10">
        <h2 className="font-display text-2xl" data-testid="chronicle-photos-heading">
          {chroniclePhotosHeading(place.name, place.photos.length)}
        </h2>
        {canWrite(ctx.role) ? (
          <PlacePhotoForm
            placeId={place.id}
            assets={loosePhotos.map((asset) => ({ id: asset.id, title: asset.title }))}
          />
        ) : null}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="place-photos">
          {place.photos.map((photo) => (
            <li key={photo.id} className="paper-card overflow-hidden">
              <Link href={`/archive/${photo.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${photo.storagePath}`} alt={photo.title || ""} className="aspect-video w-full object-cover" />
                <p className="p-4 font-display text-xl">{photo.title || "A photograph"}</p>
              </Link>
            </li>
          ))}
          {!place.photos.length ? <li className="text-bark">No photographs on this chronicle yet.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl" data-testid="place-chronicle-heading">
          {chronicleHeading(place.name, chronicle.length)}
        </h2>
        <ul className="mt-4 space-y-3" data-testid="place-chronicle">
          {chronicle.map((item) => (
            <li key={item.id} className="paper-card p-4">
              <Link href={item.href} className="font-display text-xl text-seal">{item.title}</Link>
              <p className="font-sans text-sm text-gold">{item.kind}</p>
            </li>
          ))}
          {!chronicle.length ? <li className="text-bark">Nothing yet happened here.</li> : null}
        </ul>
      </section>
      <p className="mt-8 font-sans text-sm">
        <Link href="/places" className="text-seal">All places</Link>
        {" · "}
        <Link href="/places/tree" className="text-seal">Place tree</Link>
        {" · "}
        <Link href="/map" className="text-seal">Map</Link>
        {" · "}
        <Link href="/map/photos" className="text-seal">Photo map</Link>
        {" · "}
        <Link href={`/places/${place.id}/together`} className="text-seal">Who lived here at the same time</Link>
        {" · "}
        <Link href="/map/pins" className="text-seal">Pinned letters and stories</Link>
      </p>
    </AppShell>
  );
}
