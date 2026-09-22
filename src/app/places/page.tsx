import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { placeLabel } from "@/lib/places";
import { hideEventFromViewer, hideResidenceForViewer } from "@/lib/privacy";
import { PlaceMergeForm } from "@/app/places/merge";
import { suggestPlaceDuplicates } from "@/lib/placeDuplicates";
import { canWrite } from "@/lib/roles";
import { descendantIds, filterPlacesWithin, placeBreadcrumb, placeFilterHeading, placeKindLabel } from "@/lib/placeTree";

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ within?: string }>;
}) {
  const ctx = await requireFamily();
  const { within } = await searchParams;
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: {
      parent: true,
      children: true,
      residences: { include: { person: true } },
      events: { include: { person: true } },
      photos: true,
    },
    orderBy: { name: "asc" },
  });
  const nodes = places.map((place) => ({
    id: place.id,
    name: place.name,
    kind: place.kind,
    parentId: place.parentId,
  }));
  const scoped = filterPlacesWithin(nodes, within);
  const allowed = new Set(scoped.map((place) => place.id));
  const visible = places.filter((place) => allowed.has(place.id));
  const withinPlace = places.find((place) => place.id === within);
  const people = new Map<string, { id: string; displayName: string }>();
  const events: { id: string; title: string; personId: string }[] = [];
  for (const place of visible) {
    for (const row of place.residences) {
      if (!hideResidenceForViewer(ctx.role, row.person)) {
        people.set(row.person.id, { id: row.person.id, displayName: row.person.displayName });
      }
    }
    for (const event of place.events) {
      if (!hideEventFromViewer(ctx.role, event)) events.push({ id: event.id, title: event.title, personId: event.personId });
    }
  }
  const chips = places.filter((place) => place.kind === "state" || place.kind === "county" || place.kind === "country");
  const duplicates = suggestPlaceDuplicates(places);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="places-heading">
        {withinPlace ? placeFilterHeading(withinPlace.name) : "Places"}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A city inside a county inside a state. Open Iowa or Black Hawk County to see who lived in the towns beneath.
      </p>
      <p className="mt-3 font-sans text-sm">
        <Link href="/places/tree" className="text-seal">Place tree</Link>
        {" · "}
        <Link href="/places/gaps" className="text-seal">Missing counties</Link>
        {" · "}
        <Link href="/atlas" className="text-seal">Family atlas</Link>
        {" · "}
        <Link href="/places/gps/missing" className="text-seal">Places without GPS</Link>
        {" · "}
        <Link href="/places/names" className="text-seal">Family names for places</Link>
      </p>
      <div className="mt-6 flex flex-wrap gap-2" data-testid="place-filter">
        <Link href="/places" className={`rounded-full px-3 py-1 font-sans text-sm ${!within ? "bg-seal text-cream" : "border border-bark/15"}`}>
          All places
        </Link>
        {chips.map((place) => (
          <Link
            key={place.id}
            href={`/places?within=${place.id}`}
            className={`rounded-full px-3 py-1 font-sans text-sm ${within === place.id ? "bg-seal text-cream" : "border border-bark/15"}`}
          >
            {place.name}
          </Link>
        ))}
      </div>
      {withinPlace ? (
        <p className="mt-4 font-sans text-sm text-gold" data-testid="place-within-crumb">
          {placeBreadcrumb(nodes, withinPlace.id)}
          {within ? ` · ${descendantIds(nodes, within).size} places` : ""}
        </p>
      ) : null}
      {duplicates.length ? (
        <ul className="mt-6 space-y-2" data-testid="place-duplicates">
          {duplicates.map((pair) => (
            <li key={`${pair.keepId}-${pair.dropId}`} className="font-sans text-sm text-bark">
              {pair.dropName} looks like {pair.keepName}
            </li>
          ))}
        </ul>
      ) : null}
      {canWrite(ctx.role) ? (
        <PlaceMergeForm places={places.map((place) => ({ id: place.id, name: place.name }))} />
      ) : null}
      {within ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl">People in these places</h2>
          <ul className="mt-4 space-y-2" data-testid="place-filter-people">
            {[...people.values()].map((person) => (
              <li key={person.id}>
                <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
              </li>
            ))}
            {!people.size ? <li className="text-bark">No residences in this place yet.</li> : null}
          </ul>
          <h2 className="mt-8 font-display text-2xl">Events in these places</h2>
          <ul className="mt-4 space-y-2" data-testid="place-filter-events">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/people/${event.personId}`} className="text-seal">{event.title}</Link>
              </li>
            ))}
            {!events.length ? <li className="text-bark">No dated events here yet.</li> : null}
          </ul>
        </section>
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="places-list">
        {visible.map((place) => {
          const residents = place.residences.filter((item) => !hideResidenceForViewer(ctx.role, item.person));
          return (
            <li key={place.id} className="paper-card p-5">
              <p className="font-sans text-xs uppercase tracking-wide text-gold">{placeKindLabel(place.kind)}</p>
              <Link href={`/places/${place.id}`} className="font-display text-2xl text-seal">{placeLabel(place)}</Link>
              <p className="font-sans text-sm text-bark">{placeBreadcrumb(nodes, place.id)}</p>
              <p className="text-bark">
                {residents.map((item) => item.person.displayName).join(", ") || "No residences recorded."}
              </p>
              <p className="font-sans text-sm text-gold">
                {place.events.length} dated events
                {place.photos.length ? ` · ${place.photos.length} photograph${place.photos.length === 1 ? "" : "s"}` : ""}
              </p>
            </li>
          );
        })}
        {!visible.length ? <li className="text-bark">Record a residence from a person page.</li> : null}
      </ul>
    </AppShell>
  );
}
