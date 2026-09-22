import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { huntHeading, huntsIndexHeading } from "@/lib/hunt";

const schema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const hunts = await prisma.hunt.findMany({
    where: { familyId: ctx.family.id },
    include: { clues: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    hunts,
    heading: huntsIndexHeading(hunts.length),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A hunt needs a title." }, { status: 400 });
  const hunt = await prisma.hunt.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      notes: body.data.notes?.trim() || null,
    },
    include: { clues: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "started",
    entityType: "hunt",
    entityId: hunt.id,
    title: hunt.title,
  });
  return NextResponse.json({ hunt, heading: huntHeading(hunt.title, 0) });
}
