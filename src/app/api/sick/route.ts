import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileSickWatches, sickWatchLine, sickWatchesHeading } from "@/lib/sickWatch";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  sickId: z.string(),
  personId: z.string(),
  satOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileSickWatches(
    (await prisma.sickWatch.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, sick: true },
    })).map((row) => ({
      id: row.id,
      sitter: row.person.displayName,
      sick: row.sick.displayName,
      sickId: row.sickId,
      personId: row.personId,
      satOn: row.satOn,
    })),
  );
  return NextResponse.json({ watches: rows, heading: sickWatchesHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who sat up with the sick, and with whom?" }, { status: 400 });
  const [sick, person] = await Promise.all([
    prisma.person.findFirst({ where: { id: body.data.sickId, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!sick || !person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.sickWatch.upsert({
    where: { sickId_personId: { sickId: sick.id, personId: person.id } },
    create: {
      familyId: ctx.family.id,
      sickId: sick.id,
      personId: person.id,
      satOn: parseDate(body.data.satOn),
      notes: body.data.notes?.trim() || null,
    },
    update: { satOn: parseDate(body.data.satOn), notes: body.data.notes?.trim() || null },
    include: { person: true, sick: true },
  });
  const line = sickWatchLine(row.person.displayName, row.sick.displayName, row.satOn?.toISOString().slice(0, 10));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "person",
    entityId: sick.id,
    title: sick.displayName,
    summary: line,
  });
  return NextResponse.json({ watch: row, line });
}
