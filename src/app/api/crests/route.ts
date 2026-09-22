import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileCrests, crestLine, crestsHeading } from "@/lib/familyCrest";

const schema = z.object({
  title: z.string().min(1).max(120),
  blazon: z.string().min(1).max(400),
  tincture: z.string().max(80).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.familyCrest.findMany({ where: { familyId: ctx.family.id } });
  const crests = compileCrests(rows);
  return NextResponse.json({ crests, heading: crestsHeading(crests.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A crest needs a title and a blazon." }, { status: 400 });
  const crest = await prisma.familyCrest.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      blazon: body.data.blazon.trim(),
      tincture: body.data.tincture?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
  });
  const line = crestLine(crest.title, crest.blazon);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "crest",
    entityId: crest.id,
    title: crest.title,
    summary: line,
  });
  return NextResponse.json({ crest, line });
}
