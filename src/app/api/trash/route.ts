import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  type: z.enum(["person", "photo", "letter"]),
  id: z.string(),
  restore: z.boolean().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, photos, letters] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: { not: null } },
      orderBy: { displayName: "asc" },
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return NextResponse.json({ people, photos, letters });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose what to move." }, { status: 400 });
  const deletedAt = body.data.restore ? null : new Date();
  if (body.data.type === "person") {
    const person = await prisma.person.findFirst({ where: { id: body.data.id, familyId: ctx.family.id } });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
    await prisma.person.update({ where: { id: person.id }, data: { deletedAt } });
  } else if (body.data.type === "photo") {
    const asset = await prisma.asset.findFirst({ where: { id: body.data.id, familyId: ctx.family.id } });
    if (!asset) return NextResponse.json({ error: "Photograph not found." }, { status: 404 });
    await prisma.asset.update({ where: { id: asset.id }, data: { deletedAt } });
  } else {
    const document = await prisma.document.findFirst({ where: { id: body.data.id, familyId: ctx.family.id } });
    if (!document) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
    await prisma.document.update({ where: { id: document.id }, data: { deletedAt } });
  }
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: body.data.restore ? "restored" : "moved to trash",
    entityType: body.data.type,
    entityId: body.data.id,
    title: body.data.id,
    summary: body.data.type,
  });
  return NextResponse.json({ ok: true });
}
