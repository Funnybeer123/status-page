import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileMilkStops, milkRouteHeading, milkStopLine } from "@/lib/milkRoute";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  year: z.coerce.number().int().min(1800).max(2100).optional(),
  routeId: z.string().optional(),
  personId: z.string().optional(),
  stopOrder: z.coerce.number().int().min(1).max(99).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const routes = await prisma.milkRoute.findMany({
    where: { familyId: ctx.family.id },
    include: { stops: { include: { person: true } } },
  });
  return NextResponse.json({
    routes: routes.map((route) => ({
      id: route.id,
      heading: milkRouteHeading(route.name, route.stops.length),
      stops: compileMilkStops(
        route.stops.map((stop) => ({ id: stop.id, person: stop.person.displayName, stopOrder: stop.stopOrder })),
      ),
    })),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Name the route or add a stop." }, { status: 400 });
  if (body.data.routeId && body.data.personId && body.data.stopOrder) {
    const route = await prisma.milkRoute.findFirst({ where: { id: body.data.routeId, familyId: ctx.family.id } });
    const person = await prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!route || !person) return NextResponse.json({ error: "Route or person not found." }, { status: 404 });
    const stop = await prisma.milkRouteStop.create({
      data: {
        routeId: route.id,
        personId: person.id,
        stopOrder: body.data.stopOrder,
        notes: body.data.notes?.trim() || null,
      },
      include: { person: true },
    });
    return NextResponse.json({ stop, line: milkStopLine(stop.person.displayName, stop.stopOrder) });
  }
  if (!body.data.name) return NextResponse.json({ error: "Name the milk route." }, { status: 400 });
  const route = await prisma.milkRoute.create({
    data: {
      familyId: ctx.family.id,
      name: body.data.name.trim(),
      year: body.data.year || null,
      notes: body.data.notes?.trim() || null,
    },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "milk",
    entityId: route.id,
    title: route.name,
    summary: route.name,
  });
  return NextResponse.json({ route, heading: milkRouteHeading(route.name, 0) });
}
