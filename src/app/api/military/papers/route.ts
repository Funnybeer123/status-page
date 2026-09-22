import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { normalizePaperKind, paperHeading } from "@/lib/cityDirectory";

const schema = z.object({
  personId: z.string(),
  serviceId: z.string().optional(),
  documentId: z.string().optional(),
  kind: z.string().optional(),
  year: z.union([z.string(), z.number()]).optional(),
  numberNote: z.string().max(80).optional(),
  notes: z.string().max(800).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const papers = await prisma.militaryPaper.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, service: true, document: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ papers });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Link the paper to who served." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (body.data.serviceId) {
    const service = await prisma.militaryService.findFirst({
      where: { id: body.data.serviceId, familyId: ctx.family.id },
    });
    if (!service) return NextResponse.json({ error: "That service record was not found." }, { status: 404 });
  }
  const year = body.data.year == null || body.data.year === "" ? null : Number(body.data.year);
  const paper = await prisma.militaryPaper.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      serviceId: body.data.serviceId || null,
      documentId: body.data.documentId || null,
      kind: normalizePaperKind(body.data.kind),
      year: Number.isFinite(year) ? year : null,
      numberNote: body.data.numberNote?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true, service: true, document: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "military-paper",
    entityId: paper.id,
    title: paperHeading(paper.kind, person.displayName),
  });
  return NextResponse.json({ paper });
}
