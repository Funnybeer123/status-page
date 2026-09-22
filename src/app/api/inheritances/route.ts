import { NextResponse } from "next/server";
import { DocKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileInheritances, inheritanceLine, inheritancesHeading } from "@/lib/inheritances";

const schema = z.object({
  personId: z.string(),
  title: z.string().min(1).max(160),
  documentId: z.string().optional(),
  probateId: z.string().optional(),
  notes: z.string().max(800).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const items = await prisma.inheritanceItem.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, document: true, probate: true },
  });
  const compiled = compileInheritances(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      heir: item.person.displayName,
      source: item.document?.title || item.probate?.title || null,
      notes: item.notes,
      href: item.documentId ? `/letters/${item.documentId}` : `/people/${item.personId}`,
    })),
  );
  return NextResponse.json({ items: compiled, heading: inheritancesHeading(compiled.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who inherited what." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (body.data.documentId) {
    const document = await prisma.document.findFirst({
      where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null, kind: DocKind.will },
    });
    if (!document) return NextResponse.json({ error: "Will not found." }, { status: 404 });
  }
  if (body.data.probateId) {
    const probate = await prisma.probateRecord.findFirst({
      where: { id: body.data.probateId, familyId: ctx.family.id },
    });
    if (!probate) return NextResponse.json({ error: "Probate not found." }, { status: 404 });
  }
  const item = await prisma.inheritanceItem.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      title: body.data.title.trim(),
      documentId: body.data.documentId || null,
      probateId: body.data.probateId || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true, document: true, probate: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "inheritance",
    entityId: item.id,
    title: item.title,
    summary: inheritanceLine(item.title, item.person.displayName),
  });
  return NextResponse.json({
    item,
    line: inheritanceLine(item.title, item.person.displayName),
  });
}
