import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileMailBoxes, mailBoxLine, mailRouteHeading, mailRoutesHeading } from "@/lib/ruralMail";

const routeSchema = z.object({
  name: z.string().min(1).max(120),
  days: z.string().min(1).max(80),
  carrierId: z.string().optional(),
  notes: z.string().max(400).optional(),
});

const boxSchema = z.object({
  routeId: z.string(),
  personId: z.string(),
  boxNumber: z.string().min(1).max(40),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const routes = await prisma.ruralMailRoute.findMany({
    where: { familyId: ctx.family.id },
    include: { carrier: true, boxes: { include: { person: true } } },
  });
  return NextResponse.json({
    routes: routes.map((route) => ({
      id: route.id,
      heading: mailRouteHeading(route.name, route.carrier?.displayName, route.days),
      boxes: compileMailBoxes(
        route.boxes.map((box) => ({ id: box.id, person: box.person.displayName, boxNumber: box.boxNumber })),
      ),
    })),
    heading: mailRoutesHeading(routes.length),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const json = await req.json().catch(() => null);
  const box = boxSchema.safeParse(json);
  if (box.success) {
    const [route, person] = await Promise.all([
      prisma.ruralMailRoute.findFirst({ where: { id: box.data.routeId, familyId: ctx.family.id } }),
      prisma.person.findFirst({ where: { id: box.data.personId, familyId: ctx.family.id, deletedAt: null } }),
    ]);
    if (!route || !person) return NextResponse.json({ error: "Route or person not found." }, { status: 404 });
    const row = await prisma.ruralMailBox.create({
      data: {
        routeId: route.id,
        personId: person.id,
        boxNumber: box.data.boxNumber.trim(),
        notes: box.data.notes?.trim() || null,
      },
      include: { person: true },
    });
    return NextResponse.json({ box: row, line: mailBoxLine(row.person.displayName, row.boxNumber) });
  }
  const body = routeSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Name the route, or add a box." }, { status: 400 });
  if (body.data.carrierId) {
    const carrier = await prisma.person.findFirst({
      where: { id: body.data.carrierId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!carrier) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const route = await prisma.ruralMailRoute.create({
    data: {
      familyId: ctx.family.id,
      name: body.data.name.trim(),
      days: body.data.days.trim(),
      carrierId: body.data.carrierId || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { carrier: true },
  });
  const heading = mailRouteHeading(route.name, route.carrier?.displayName, route.days);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "mail",
    entityId: route.id,
    title: heading,
    summary: heading,
  });
  return NextResponse.json({ route, heading });
}
