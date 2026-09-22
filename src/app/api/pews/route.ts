import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compilePews, pewLine, pewsHeading } from "@/lib/churchPew";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  church: z.string().min(1).max(160),
  pewNumber: z.string().min(1).max(40),
  startedOn: z.string().optional(),
  endedOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compilePews(
    (await prisma.churchPew.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      church: row.church,
      pewNumber: row.pewNumber,
      person: row.person.displayName,
    })),
  );
  return NextResponse.json({ pews: rows, heading: pewsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Which church pew, and who rented it?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.churchPew.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      church: body.data.church.trim(),
      pewNumber: body.data.pewNumber.trim(),
      startedOn: parseDate(body.data.startedOn),
      endedOn: parseDate(body.data.endedOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = pewLine(row.church, row.pewNumber, row.person.displayName);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "pew",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ pew: row, line });
}
