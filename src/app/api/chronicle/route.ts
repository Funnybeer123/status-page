import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { chronicleHeading, chroniclePhotosHeading, compileChronicle, placeMatch } from "@/lib/placeChronicle";
import { hideEventFromViewer, hideResidenceForViewer } from "@/lib/privacy";
import { descendantIds } from "@/lib/placeTree";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const placeId = new URL(req.url).searchParams.get("placeId");
  if (!placeId) return NextResponse.json({ error: "Choose a place." }, { status: 400 });
  const [place, places] = await Promise.all([
    prisma.place.findFirst({
      where: { id: placeId, familyId: ctx.family.id },
      include: {
        residences: { include: { person: true } },
        events: { include: { person: true } },
        photos: true,
      },
    }),
    prisma.place.findMany({
      where: { familyId: ctx.family.id },
      select: { id: true, name: true, parentId: true, kind: true },
    }),
  ]);
  if (!place) return NextResponse.json({ error: "Place not found." }, { status: 404 });
  const inside = descendantIds(
    places.map((row) => ({ id: row.id, name: row.name, kind: row.kind, parentId: row.parentId })),
    place.id,
  );
  const [homes, households, voyages, letters, stories] = await Promise.all([
    prisma.familyHome.findMany({ where: { familyId: ctx.family.id } }),
    prisma.censusHousehold.findMany({ where: { familyId: ctx.family.id } }),
    prisma.voyage.findMany({ where: { familyId: ctx.family.id } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    }),
    prisma.story.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const items = compileChronicle([
    ...place.residences
      .filter((row) => !hideResidenceForViewer(ctx.role, row.person))
      .map((row) => ({
        id: `residence-${row.id}`,
        kind: "residence" as const,
        title: `${row.person.displayName} lived here`,
        href: `/people/${row.personId}`,
        date: row.startedAt,
      })),
    ...place.events
      .filter((event) => !hideEventFromViewer(ctx.role, event))
      .map((event) => ({
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
  const photos = place.photos.map((photo) => ({
    id: photo.id,
    title: photo.title || "A photograph",
    href: `/archive/${photo.id}`,
    date: photo.capturedAt,
  }));
  return NextResponse.json({
    place: { id: place.id, name: place.name },
    items,
    heading: chronicleHeading(place.name, items.length),
    photos,
    photosHeading: chroniclePhotosHeading(place.name, photos.length),
  });
}
