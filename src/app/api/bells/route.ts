import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { churchBellLine, churchBellsHeading, compileBells } from "@/lib/churchBell";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  service: z.string().min(1).max(160),
  rangOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileBells(
    (await prisma.churchBell.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      service: row.service,
      rangOn: row.rangOn,
    })),
  );
  return NextResponse.json({ bells: rows, heading: churchBellsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who rang, and for which service?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.churchBell.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      service: body.data.service.trim(),
      rangOn: parseDate(body.data.rangOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = churchBellLine(row.person.displayName, row.service, row.rangOn?.toISOString().slice(0, 10));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "bell",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ bell: row, line });
}
