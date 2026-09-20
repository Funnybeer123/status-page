import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const story = await prisma.story.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      teller: true,
      people: { include: { person: true } },
      document: true,
      citations: { include: { document: true, asset: true } },
    },
  });
  if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  return NextResponse.json({ story });
}
