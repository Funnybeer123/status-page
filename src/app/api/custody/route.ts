import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  holderId: z.string(),
  title: z.string().min(1).max(160),
  kind: z.string().min(1).max(40),
  documentId: z.string().optional(),
  assetId: z.string().optional(),
  notes: z.string().max(800).optional(),
  sinceOn: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const records = await prisma.custodyRecord.findMany({
    where: { familyId: ctx.family.id },
    include: { holder: true, document: true, asset: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ records });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who holds the original." }, { status: 400 });
  const holder = await prisma.person.findFirst({
    where: { id: body.data.holderId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!holder) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const record = await prisma.custodyRecord.create({
    data: {
      familyId: ctx.family.id,
      holderId: holder.id,
      title: body.data.title.trim(),
      kind: body.data.kind.trim(),
      documentId: body.data.documentId || null,
      assetId: body.data.assetId || null,
      notes: body.data.notes?.trim() || null,
      sinceOn: body.data.sinceOn ? new Date(body.data.sinceOn) : null,
    },
    include: { holder: true, document: true, asset: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "custody",
    entityId: record.id,
    title: record.title,
    summary: holder.displayName,
  });
  return NextResponse.json({ record });
}
