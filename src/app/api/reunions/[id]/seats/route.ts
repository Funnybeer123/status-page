import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { groupSeats, seatLine, seatingHeading } from "@/lib/seating";

const schema = z.object({
  personId: z.string(),
  tableName: z.string().min(1).max(80),
  seat: z.union([z.number(), z.string()]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { seats: { include: { person: true }, orderBy: [{ tableName: "asc" }, { seat: "asc" }] } },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const seats = reunion.seats.map((row) => ({
    ...row,
    line: seatLine(row.person.displayName, row.tableName, row.seat),
  }));
  return NextResponse.json({
    reunion,
    seats,
    tables: groupSeats(seats),
    heading: seatingHeading(reunion.title, seats.length),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A guest and a table are required." }, { status: 400 });
  const reunion = await prisma.reunionGathering.findFirst({ where: { id, familyId: ctx.family.id } });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const seat = body.data.seat == null || body.data.seat === "" ? null : Number(body.data.seat);
  const row = await prisma.reunionSeat.upsert({
    where: { reunionId_personId: { reunionId: reunion.id, personId: person.id } },
    create: {
      familyId: ctx.family.id,
      reunionId: reunion.id,
      personId: person.id,
      tableName: body.data.tableName.trim(),
      seat: Number.isFinite(seat) ? seat : null,
    },
    update: {
      tableName: body.data.tableName.trim(),
      seat: Number.isFinite(seat) ? seat : null,
    },
    include: { person: true },
  });
  return NextResponse.json({
    seat: row,
    line: seatLine(row.person.displayName, row.tableName, row.seat),
  });
}
