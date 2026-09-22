import { NextResponse } from "next/server";
import { DocKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(12000),
  writtenAt: z.string().optional(),
  personIds: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const wills = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.will },
    include: { people: { include: { person: true } } },
    orderBy: { writtenAt: "desc" },
  });
  return NextResponse.json({ wills });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A will needs a title and the family’s words." }, { status: 400 });
  const personIds = body.data.personIds ?? [];
  const will = await prisma.document.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      kind: DocKind.will,
      transcript: body.data.body.trim(),
      writtenAt: body.data.writtenAt ? new Date(body.data.writtenAt) : null,
      people: personIds.length ? { create: personIds.map((personId) => ({ personId })) } : undefined,
    },
    include: { people: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "saved",
    entityType: "will",
    entityId: will.id,
    title: will.title,
    summary: "will",
  });
  return NextResponse.json({ will });
}
