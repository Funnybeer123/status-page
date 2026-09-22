import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { arrivedLine, checkinHeading, compileCheckin } from "@/lib/reunionCheckin";

const schema = z.object({
  reunionId: z.string(),
  personId: z.string(),
  arrived: z.boolean().optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const reunionId = new URL(req.url).searchParams.get("reunionId") || "";
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id: reunionId, familyId: ctx.family.id },
    include: { guests: { include: { person: true } } },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const guests = compileCheckin(reunion.guests);
  return NextResponse.json({
    heading: checkinHeading(reunion.title, guests.filter((guest) => guest.arrived).length, guests.length),
    guests,
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who arrived." }, { status: 400 });
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id: body.data.reunionId, familyId: ctx.family.id },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const arrived = body.data.arrived !== false;
  const guest = await prisma.reunionGuest.upsert({
    where: { reunionId_personId: { reunionId: reunion.id, personId: person.id } },
    create: {
      reunionId: reunion.id,
      personId: person.id,
      coming: true,
      arrived,
      arrivedAt: arrived ? new Date() : null,
    },
    update: {
      arrived,
      arrivedAt: arrived ? new Date() : null,
    },
    include: { person: true },
  });
  return NextResponse.json({
    guest,
    line: arrivedLine(guest.person.displayName, guest.arrivedAt),
  });
}
