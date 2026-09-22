import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { gownHeading, gownsHeading } from "@/lib/christeningGown";
import { parseDate } from "@/lib/parse";

const gownSchema = z.object({
  title: z.string().min(1).max(160),
  notes: z.string().max(400).optional(),
});

const wearSchema = z.object({
  gownId: z.string(),
  personId: z.string(),
  wornOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const gowns = await prisma.christeningGown.findMany({
    where: { familyId: ctx.family.id },
    include: { wears: { include: { person: true } } },
  });
  return NextResponse.json({ gowns, heading: gownsHeading(gowns.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const json = await req.json().catch(() => null);
  const wear = wearSchema.safeParse(json);
  if (wear.success) {
    const [gown, person] = await Promise.all([
      prisma.christeningGown.findFirst({ where: { id: wear.data.gownId, familyId: ctx.family.id } }),
      prisma.person.findFirst({ where: { id: wear.data.personId, familyId: ctx.family.id, deletedAt: null } }),
    ]);
    if (!gown || !person) return NextResponse.json({ error: "Gown or person not found." }, { status: 404 });
    const row = await prisma.christeningGownWear.create({
      data: {
        familyId: ctx.family.id,
        gownId: gown.id,
        personId: person.id,
        wornOn: parseDate(wear.data.wornOn),
        notes: wear.data.notes?.trim() || null,
      },
      include: { person: true, gown: true },
    });
    return NextResponse.json({ wear: row, heading: gownHeading(gown.title, 1) });
  }
  const body = gownSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Name the gown or who wore it." }, { status: 400 });
  const gown = await prisma.christeningGown.create({
    data: { familyId: ctx.family.id, title: body.data.title.trim(), notes: body.data.notes?.trim() || null },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "gown",
    entityId: gown.id,
    title: gown.title,
    summary: gown.title,
  });
  return NextResponse.json({ gown, heading: gownsHeading(1) });
}
