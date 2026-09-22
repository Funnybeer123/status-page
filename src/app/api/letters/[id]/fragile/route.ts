import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { fragileOriginalLabel, isFragileOriginal } from "@/lib/fragileLetter";

const schema = z.object({
  fragile: z.boolean(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say whether this letter is a fragile original." }, { status: 400 });
  const existing = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const document = await prisma.document.update({
    where: { id },
    data: { fragileOriginal: body.data.fragile },
  });
  return NextResponse.json({
    document,
    fragile: isFragileOriginal(document),
    label: document.fragileOriginal ? fragileOriginalLabel() : null,
  });
}
