import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  personId: z.string(),
  documentId: z.string().optional(),
  assetId: z.string().optional(),
  notes: z.string().max(800).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const samples = await prisma.handwritingSample.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, document: true, asset: true },
    orderBy: { person: { displayName: "asc" } },
  });
  return NextResponse.json({ samples });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success || (!body.data.documentId && !body.data.assetId)) {
    return NextResponse.json({ error: "Link a letter or a scan of the handwriting." }, { status: 400 });
  }
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const sample = await prisma.handwritingSample.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      documentId: body.data.documentId || null,
      assetId: body.data.assetId || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true, document: true, asset: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "handwriting",
    entityId: sample.id,
    title: person.displayName,
  });
  return NextResponse.json({ sample });
}
