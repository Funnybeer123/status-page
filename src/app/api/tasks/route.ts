import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(4000).optional(),
  personId: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string(),
  done: z.boolean(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const tasks = await prisma.researchTask.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
    orderBy: [{ doneAt: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = createSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A research task needs a title." }, { status: 400 });
  const task = await prisma.researchTask.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      body: body.data.body?.trim() || null,
      personId: body.data.personId || null,
      createdById: ctx.session.user.id,
    },
    include: { person: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "task",
    entityId: task.id,
    title: task.title,
    summary: task.person?.displayName || "research",
  });
  return NextResponse.json({ task });
}

export async function PATCH(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Mark which task is done." }, { status: 400 });
  const existing = await prisma.researchTask.findFirst({
    where: { id: body.data.id, familyId: ctx.family.id },
  });
  if (!existing) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  const task = await prisma.researchTask.update({
    where: { id: existing.id },
    data: { doneAt: body.data.done ? new Date() : null },
    include: { person: true },
  });
  return NextResponse.json({ task });
}
