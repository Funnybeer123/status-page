import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compilePallbearers, pallbearerLine, pallbearersHeading } from "@/lib/pallbearers";

const schema = z.object({
  deceasedId: z.string(),
  personId: z.string(),
  role: z.string().min(1).max(80),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.funeralPallbearer.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, deceased: true },
  });
  const compiled = compilePallbearers(
    rows.map((row) => ({
      id: row.id,
      deceased: row.deceased.displayName,
      bearer: row.person.displayName,
      role: row.role,
      deceasedId: row.deceasedId,
      personId: row.personId,
    })),
  );
  return NextResponse.json({ pallbearers: compiled, heading: pallbearersHeading(compiled.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who carried and what role they held." }, { status: 400 });
  const [deceased, person] = await Promise.all([
    prisma.person.findFirst({ where: { id: body.data.deceasedId, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!deceased || !person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.funeralPallbearer.upsert({
    where: { deceasedId_personId: { deceasedId: deceased.id, personId: person.id } },
    create: {
      familyId: ctx.family.id,
      deceasedId: deceased.id,
      personId: person.id,
      role: body.data.role.trim(),
      notes: body.data.notes?.trim() || null,
    },
    update: { role: body.data.role.trim(), notes: body.data.notes?.trim() || null },
    include: { person: true, deceased: true },
  });
  const line = pallbearerLine(row.person.displayName, row.role, row.deceased.displayName);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "person",
    entityId: deceased.id,
    title: deceased.displayName,
    summary: line,
  });
  return NextResponse.json({ pallbearer: row, line });
}
