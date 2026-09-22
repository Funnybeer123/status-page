import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileElevators, elevatorLine, elevatorsHeading } from "@/lib/grainElevator";

const schema = z.object({
  personId: z.string(),
  elevator: z.string().min(1).max(160),
  account: z.string().min(1).max(80),
  year: z.coerce.number().int().min(1800).max(2100).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileElevators(
    (await prisma.grainElevatorAccount.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      elevator: row.elevator,
      account: row.account,
      year: row.year,
    })),
  );
  return NextResponse.json({ elevators: rows, heading: elevatorsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Which elevator, and whose account?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.grainElevatorAccount.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      elevator: body.data.elevator.trim(),
      account: body.data.account.trim(),
      year: body.data.year || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = elevatorLine(row.person.displayName, row.elevator, row.account, row.year);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "elevator",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ elevator: row, line });
}
