import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileStrays, strayNoticeLine, straysHeading } from "@/lib/strayNotice";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  animal: z.string().min(1).max(160),
  postedOn: z.string().optional(),
  place: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileStrays(
    (await prisma.strayNotice.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      animal: row.animal,
      postedOn: row.postedOn,
      place: row.place,
    })),
  );
  return NextResponse.json({ notices: rows, heading: straysHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who posted, and which animal?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.strayNotice.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      animal: body.data.animal.trim(),
      postedOn: parseDate(body.data.postedOn),
      place: body.data.place?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = strayNoticeLine(row.person.displayName, row.animal, row.postedOn?.toISOString().slice(0, 10));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "stray",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ notice: row, line });
}
