import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  documentId: z.string(),
  needsReview: z.boolean().optional(),
  transcript: z.string().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const documents = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, needsReview: true },
    include: { people: { include: { person: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a letter to review." }, { status: 400 });
  const existing = await prisma.document.findFirst({
    where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const document = await prisma.document.update({
    where: { id: existing.id },
    data: {
      needsReview: body.data.needsReview ?? false,
      transcript: body.data.transcript ?? existing.transcript,
    },
  });
  return NextResponse.json({ document });
}
