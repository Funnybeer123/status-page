import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileVehicles, vehicleLine, vehicleYears, vehiclesHeading } from "@/lib/vehicles";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  name: z.string().min(1).max(120),
  kind: z.string().min(1).max(40),
  personId: z.string().optional(),
  startedOn: z.string().optional(),
  endedOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileVehicles(
    (await prisma.familyVehicle.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      owner: row.person?.displayName,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
    })),
  );
  return NextResponse.json({ vehicles: rows, heading: vehiclesHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Name the wagon, car, or truck." }, { status: 400 });
  if (body.data.personId) {
    const person = await prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const row = await prisma.familyVehicle.create({
    data: {
      familyId: ctx.family.id,
      name: body.data.name.trim(),
      kind: body.data.kind.trim(),
      personId: body.data.personId || null,
      startedOn: parseDate(body.data.startedOn),
      endedOn: parseDate(body.data.endedOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = vehicleLine(row.name, row.kind, vehicleYears(row.startedOn, row.endedOn));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "vehicle",
    entityId: row.id,
    title: row.name,
    summary: line,
  });
  return NextResponse.json({ vehicle: row, line });
}
