import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileDeathwatches, deathwatchLine, deathwatchesHeading } from "@/lib/deathwatch";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  deceasedId: z.string(),
  personId: z.string(),
  watchedOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileDeathwatches(
    (await prisma.deathwatch.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, deceased: true },
    })).map((row) => ({
      id: row.id,
      deceased: row.deceased.displayName,
      sitter: row.person.displayName,
      deceasedId: row.deceasedId,
      personId: row.personId,
      watchedOn: row.watchedOn,
    })),
  );
  return NextResponse.json({ watches: rows, heading: deathwatchesHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who sat the deathwatch, and for whom?" }, { status: 400 });
  const [deceased, person] = await Promise.all([
    prisma.person.findFirst({ where: { id: body.data.deceasedId, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!deceased || !person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.deathwatch.upsert({
    where: { deceasedId_personId: { deceasedId: deceased.id, personId: person.id } },
    create: {
      familyId: ctx.family.id,
      deceasedId: deceased.id,
      personId: person.id,
      watchedOn: parseDate(body.data.watchedOn),
      notes: body.data.notes?.trim() || null,
    },
    update: { watchedOn: parseDate(body.data.watchedOn), notes: body.data.notes?.trim() || null },
    include: { person: true, deceased: true },
  });
  const line = deathwatchLine(row.person.displayName, row.deceased.displayName, row.watchedOn?.toISOString().slice(0, 10));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "person",
    entityId: deceased.id,
    title: deceased.displayName,
    summary: line,
  });
  return NextResponse.json({ watch: row, line });
}
