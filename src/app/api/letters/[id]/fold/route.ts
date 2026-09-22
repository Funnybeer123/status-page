import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { foldDiagramHeading, foldLine, foldSteps } from "@/lib/letterFold";

const schema = z.object({
  foldPattern: z.string().min(1).max(80),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!letter) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  return NextResponse.json({
    letter: { id: letter.id, title: letter.title, foldPattern: letter.foldPattern },
    line: foldLine(letter.foldPattern),
    heading: foldDiagramHeading(letter.title),
    steps: foldSteps(letter.foldPattern),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say how the page was folded." }, { status: 400 });
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!letter) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const updated = await prisma.document.update({
    where: { id: letter.id },
    data: { foldPattern: body.data.foldPattern.trim() },
  });
  return NextResponse.json({
    letter: { id: updated.id, title: updated.title, foldPattern: updated.foldPattern },
    line: foldLine(updated.foldPattern),
    heading: foldDiagramHeading(updated.title),
    steps: foldSteps(updated.foldPattern),
  });
}
