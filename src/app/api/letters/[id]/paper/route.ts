import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { paperMillLine } from "@/lib/paperMill";

const schema = z.object({
  paperMill: z.string().min(1).max(120),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Which mill made the paper?" }, { status: 400 });
  const existing = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const letter = await prisma.document.update({
    where: { id },
    data: { paperMill: body.data.paperMill.trim() },
  });
  return NextResponse.json({ letter, line: paperMillLine(letter.paperMill) });
}
