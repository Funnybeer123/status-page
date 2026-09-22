import { NextResponse } from "next/server";
import { DocKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(8000),
  writtenAt: z.string().optional(),
  personIds: z.array(z.string()).optional(),
  holidayId: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const recipes = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.recipe },
    include: { people: { include: { person: true } }, holiday: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ recipes });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A recipe needs a title and the family’s words." }, { status: 400 });
  const personIds = body.data.personIds ?? [];
  const recipe = await prisma.document.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      kind: DocKind.recipe,
      transcript: body.data.body.trim(),
      writtenAt: body.data.writtenAt ? new Date(body.data.writtenAt) : null,
      holidayId: body.data.holidayId || null,
      people: personIds.length ? { create: personIds.map((personId) => ({ personId })) } : undefined,
    },
    include: { people: { include: { person: true } }, holiday: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "saved",
    entityType: "recipe",
    entityId: recipe.id,
    title: recipe.title,
    summary: "recipe",
  });
  return NextResponse.json({ recipe });
}
