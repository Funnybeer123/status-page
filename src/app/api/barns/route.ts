import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { barnJobLine, barnRaisingHeading, barnRaisingsHeading } from "@/lib/barnRaising";
import { parseDate } from "@/lib/parse";

const raisingSchema = z.object({
  title: z.string().min(1).max(160),
  heldOn: z.string().optional(),
  place: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

const crewSchema = z.object({
  raisingId: z.string(),
  personId: z.string(),
  job: z.string().min(1).max(80),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const barns = await prisma.barnRaising.findMany({
    where: { familyId: ctx.family.id },
    include: { crew: { include: { person: true } } },
  });
  return NextResponse.json({ barns, heading: barnRaisingsHeading(barns.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const json = await req.json().catch(() => null);
  const crew = crewSchema.safeParse(json);
  if (crew.success) {
    const [raising, person] = await Promise.all([
      prisma.barnRaising.findFirst({ where: { id: crew.data.raisingId, familyId: ctx.family.id } }),
      prisma.person.findFirst({ where: { id: crew.data.personId, familyId: ctx.family.id, deletedAt: null } }),
    ]);
    if (!raising || !person) return NextResponse.json({ error: "Barn or person not found." }, { status: 404 });
    const row = await prisma.barnRaisingCrew.upsert({
      where: { raisingId_personId: { raisingId: raising.id, personId: person.id } },
      create: {
        familyId: ctx.family.id,
        raisingId: raising.id,
        personId: person.id,
        job: crew.data.job.trim(),
        notes: crew.data.notes?.trim() || null,
      },
      update: { job: crew.data.job.trim(), notes: crew.data.notes?.trim() || null },
      include: { person: true },
    });
    return NextResponse.json({
      crew: row,
      line: barnJobLine(row.person.displayName, row.job),
      heading: barnRaisingHeading(raising.title, 1),
    });
  }
  const body = raisingSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Name the barn raising or who worked it." }, { status: 400 });
  const raising = await prisma.barnRaising.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      heldOn: parseDate(body.data.heldOn),
      place: body.data.place?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "barn",
    entityId: raising.id,
    title: raising.title,
    summary: raising.title,
  });
  return NextResponse.json({ barn: raising, heading: barnRaisingsHeading(1) });
}
