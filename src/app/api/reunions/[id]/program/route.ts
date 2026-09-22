import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileProgram, programHeading, programLine } from "@/lib/reunionProgram";

const schema = z.object({
  title: z.string().min(1).max(160),
  startsAt: z.string().max(40).optional(),
  personId: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { programItems: { include: { person: true } } },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const items = compileProgram(
    reunion.programItems.map((item) => ({
      id: item.id,
      title: item.title,
      startsAt: item.startsAt,
      personName: item.person?.displayName,
      notes: item.notes,
    })),
  );
  return NextResponse.json({ items, heading: programHeading(reunion.title, items.length) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Add a program item." }, { status: 400 });
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  if (body.data.personId) {
    const person = await prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const item = await prisma.reunionProgramItem.create({
    data: {
      familyId: ctx.family.id,
      reunionId: reunion.id,
      title: body.data.title.trim(),
      startsAt: body.data.startsAt?.trim() || null,
      personId: body.data.personId || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = programLine(item.title, item.person?.displayName, item.startsAt);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "reunion",
    entityId: reunion.id,
    title: `${reunion.title} · ${item.title}`,
    summary: line,
  });
  return NextResponse.json({ item, line, heading: programHeading(reunion.title, 1) });
}
