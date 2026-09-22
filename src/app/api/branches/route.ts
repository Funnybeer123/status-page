import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1).max(160),
  summary: z.string().max(800).optional(),
  personIds: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const branches = await prisma.familyBranch.findMany({
    where: { familyId: ctx.family.id },
    include: { members: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ branches });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A branch needs a name." }, { status: 400 });
  const personIds = [...new Set(body.data.personIds ?? [])];
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: personIds }, deletedAt: null },
  });
  const branch = await prisma.familyBranch.create({
    data: {
      familyId: ctx.family.id,
      name: body.data.name.trim(),
      summary: body.data.summary?.trim() || null,
      members: people.length ? { create: people.map((person) => ({ personId: person.id })) } : undefined,
    },
    include: { members: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "named",
    entityType: "branch",
    entityId: branch.id,
    title: branch.name,
    summary: branch.summary,
  });
  return NextResponse.json({ branch });
}
