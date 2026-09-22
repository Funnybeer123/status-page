import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().max(4000).optional(),
  season: z.string().max(80).optional(),
  personId: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const traditions = await prisma.tradition.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ traditions });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A tradition needs a name." }, { status: 400 });
  const tradition = await prisma.tradition.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      summary: body.data.summary?.trim() || null,
      season: body.data.season?.trim() || null,
      personId: body.data.personId || null,
    },
    include: { person: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "tradition",
    entityId: tradition.id,
    title: tradition.title,
    summary: tradition.season || "tradition",
  });
  return NextResponse.json({ tradition });
}
