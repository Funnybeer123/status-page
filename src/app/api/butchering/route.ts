import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { butcheringsHeading, butcherJobLine, butcheringHeading } from "@/lib/butchering";
import { parseDate } from "@/lib/parse";

const crewSchema = z.object({
  title: z.string().min(1).max(160),
  heldOn: z.string().optional(),
  place: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

const workerSchema = z.object({
  crewId: z.string(),
  personId: z.string(),
  job: z.string().min(1).max(80),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const crews = await prisma.butcheringCrew.findMany({
    where: { familyId: ctx.family.id },
    include: { workers: { include: { person: true } } },
  });
  return NextResponse.json({ crews, heading: butcheringsHeading(crews.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const json = await req.json().catch(() => null);
  const worker = workerSchema.safeParse(json);
  if (worker.success) {
    const [crew, person] = await Promise.all([
      prisma.butcheringCrew.findFirst({ where: { id: worker.data.crewId, familyId: ctx.family.id } }),
      prisma.person.findFirst({ where: { id: worker.data.personId, familyId: ctx.family.id, deletedAt: null } }),
    ]);
    if (!crew || !person) return NextResponse.json({ error: "Crew or person not found." }, { status: 404 });
    const row = await prisma.butcheringWorker.upsert({
      where: { crewId_personId: { crewId: crew.id, personId: person.id } },
      create: {
        familyId: ctx.family.id,
        crewId: crew.id,
        personId: person.id,
        job: worker.data.job.trim(),
        notes: worker.data.notes?.trim() || null,
      },
      update: { job: worker.data.job.trim(), notes: worker.data.notes?.trim() || null },
      include: { person: true },
    });
    return NextResponse.json({
      worker: row,
      line: butcherJobLine(row.person.displayName, row.job),
      heading: butcheringHeading(crew.title, 1),
    });
  }
  const body = crewSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Name the hog day, or who came and their job." }, { status: 400 });
  const crew = await prisma.butcheringCrew.create({
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
    entityType: "butchering",
    entityId: crew.id,
    title: crew.title,
    summary: crew.title,
  });
  return NextResponse.json({ crew, heading: butcheringsHeading(1) });
}
