import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { quiltingBeeHeading, quiltingBeesHeading, quiltingBlockLine } from "@/lib/quiltingBee";
import { parseDate } from "@/lib/parse";

const beeSchema = z.object({
  title: z.string().min(1).max(160),
  heldOn: z.string().optional(),
  place: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

const blockSchema = z.object({
  beeId: z.string(),
  personId: z.string(),
  block: z.string().min(1).max(80),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const bees = await prisma.quiltingBee.findMany({
    where: { familyId: ctx.family.id },
    include: { blocks: { include: { person: true } } },
  });
  return NextResponse.json({ bees, heading: quiltingBeesHeading(bees.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const json = await req.json().catch(() => null);
  const block = blockSchema.safeParse(json);
  if (block.success) {
    const [bee, person] = await Promise.all([
      prisma.quiltingBee.findFirst({ where: { id: block.data.beeId, familyId: ctx.family.id } }),
      prisma.person.findFirst({ where: { id: block.data.personId, familyId: ctx.family.id, deletedAt: null } }),
    ]);
    if (!bee || !person) return NextResponse.json({ error: "Bee or person not found." }, { status: 404 });
    const row = await prisma.quiltingBeeBlock.upsert({
      where: { beeId_personId: { beeId: bee.id, personId: person.id } },
      create: {
        familyId: ctx.family.id,
        beeId: bee.id,
        personId: person.id,
        block: block.data.block.trim(),
        notes: block.data.notes?.trim() || null,
      },
      update: { block: block.data.block.trim(), notes: block.data.notes?.trim() || null },
      include: { person: true, bee: true },
    });
    return NextResponse.json({
      block: row,
      line: quiltingBlockLine(row.person.displayName, row.block),
      heading: quiltingBeeHeading(bee.title, 1),
    });
  }
  const body = beeSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Name the bee or who stitched a block." }, { status: 400 });
  const bee = await prisma.quiltingBee.create({
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
    entityType: "bee",
    entityId: bee.id,
    title: bee.title,
    summary: bee.title,
  });
  return NextResponse.json({ bee, heading: quiltingBeesHeading(1) });
}
