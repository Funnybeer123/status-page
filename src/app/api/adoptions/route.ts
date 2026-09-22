import { NextResponse } from "next/server";
import { RelType, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { adoptionHeading } from "@/lib/adoptionPaper";
import { formatDate } from "@/lib/dates";

const schema = z.object({
  relationshipId: z.string(),
  documentId: z.string().optional(),
  grantedOn: z.string().optional(),
  notes: z.string().max(800).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const papers = await prisma.adoptionPaper.findMany({
    where: { familyId: ctx.family.id },
    include: {
      document: true,
      relationship: { include: { fromPerson: true, toPerson: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ papers });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Link the paper to an adoption." }, { status: 400 });
  const relationship = await prisma.relationship.findFirst({
    where: { id: body.data.relationshipId, familyId: ctx.family.id, type: RelType.adoptive },
    include: { fromPerson: true, toPerson: true },
  });
  if (!relationship) return NextResponse.json({ error: "That adoptive relationship was not found." }, { status: 404 });
  const document = body.data.documentId
    ? await prisma.document.findFirst({ where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null } })
    : null;
  if (body.data.documentId && !document) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const paper = await prisma.adoptionPaper.upsert({
    where: { relationshipId: relationship.id },
    create: {
      familyId: ctx.family.id,
      relationshipId: relationship.id,
      documentId: document?.id ?? null,
      grantedOn: body.data.grantedOn ? new Date(body.data.grantedOn) : null,
      notes: body.data.notes?.trim() || null,
    },
    update: {
      documentId: document?.id ?? null,
      grantedOn: body.data.grantedOn ? new Date(body.data.grantedOn) : null,
      notes: body.data.notes?.trim() || null,
    },
    include: { document: true, relationship: { include: { fromPerson: true, toPerson: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "adoption",
    entityId: paper.id,
    title: adoptionHeading(relationship.toPerson.displayName, relationship.fromPerson.displayName),
    summary: formatDate(paper.grantedOn, ""),
  });
  return NextResponse.json({ paper });
}
