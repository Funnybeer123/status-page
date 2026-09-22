import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { shouldHideLivingFacts } from "@/lib/privacy";

const schema = z.object({
  claim: z.string().min(1).max(400),
  personId: z.string().optional(),
  eventId: z.string().optional(),
  nameId: z.string().optional(),
  residenceId: z.string().optional(),
  storyId: z.string().optional(),
  documentId: z.string().optional(),
  assetId: z.string().optional(),
  pageNote: z.string().max(240).optional(),
  quality: z.enum(["original", "copy", "unsure"]).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const personId = new URL(req.url).searchParams.get("personId");
  const citations = await prisma.citation.findMany({
    where: { familyId: ctx.family.id, ...(personId ? { personId } : {}) },
    include: { person: true, document: true, asset: true, event: true, name: true, story: true },
    orderBy: { claim: "asc" },
  });
  return NextResponse.json({
    citations: citations.filter((item) => !shouldHideLivingFacts(ctx.role, item.person)),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A citation needs a claim." }, { status: 400 });
  if (body.data.personId) {
    const person = await prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id },
    });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  if (body.data.documentId) {
    const document = await prisma.document.findFirst({
      where: { id: body.data.documentId, familyId: ctx.family.id },
    });
    if (!document) return NextResponse.json({ error: "That letter is not in this family." }, { status: 400 });
  }
  if (body.data.assetId) {
    const asset = await prisma.asset.findFirst({
      where: { id: body.data.assetId, familyId: ctx.family.id },
    });
    if (!asset) return NextResponse.json({ error: "That archive item is not in this family." }, { status: 400 });
  }
  const citation = await prisma.citation.create({
    data: {
      familyId: ctx.family.id,
      claim: body.data.claim.trim(),
      personId: body.data.personId || null,
      eventId: body.data.eventId || null,
      nameId: body.data.nameId || null,
      residenceId: body.data.residenceId || null,
      storyId: body.data.storyId || null,
      documentId: body.data.documentId || null,
      assetId: body.data.assetId || null,
      pageNote: body.data.pageNote?.trim() || null,
      quality: body.data.quality || null,
    },
    include: { document: true, asset: true, event: true, name: true, story: true, person: true },
  });
  return NextResponse.json({ citation });
}
