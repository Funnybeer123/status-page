import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { findOrCreatePlace, placeLabel } from "@/lib/places";
import { descendantIds, filterPlacesWithin, placeBreadcrumb } from "@/lib/placeTree";

const schema = z.object({
  name: z.string().min(1).max(160),
  locality: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
  parentId: z.string().optional(),
  kind: z.string().max(40).optional(),
  gps: z.string().max(80).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const within = new URL(req.url).searchParams.get("within") || undefined;
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: {
      parent: true,
      children: true,
      residences: { include: { person: true } },
      events: { include: { person: true } },
      _count: { select: { residences: true, events: true } },
    },
    orderBy: { name: "asc" },
  });
  const nodes = places.map((place) => ({
    id: place.id,
    name: place.name,
    kind: place.kind,
    parentId: place.parentId,
  }));
  const visible = filterPlacesWithin(nodes, within);
  const allowed = new Set(visible.map((place) => place.id));
  const scoped = places.filter((place) => allowed.has(place.id));
  const people = new Map<string, { id: string; displayName: string }>();
  const events: { id: string; title: string; placeId: string | null }[] = [];
  for (const place of scoped) {
    for (const row of place.residences) people.set(row.person.id, { id: row.person.id, displayName: row.person.displayName });
    for (const event of place.events) events.push({ id: event.id, title: event.title, placeId: event.placeId });
  }
  return NextResponse.json({
    places: scoped.map((place) => ({
      ...place,
      label: placeLabel(place),
      breadcrumb: placeBreadcrumb(nodes, place.id),
    })),
    within,
    descendantCount: within ? descendantIds(nodes, within).size : places.length,
    people: [...people.values()],
    events,
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A place name is required." }, { status: 400 });
  const place = await findOrCreatePlace({
    familyId: ctx.family.id,
    name: body.data.name,
    locality: body.data.locality,
    region: body.data.region,
    country: body.data.country,
    latitude: body.data.latitude,
    longitude: body.data.longitude,
    parentId: body.data.parentId,
    kind: body.data.kind,
    gps: body.data.gps,
  });
  return NextResponse.json({ place });
}
