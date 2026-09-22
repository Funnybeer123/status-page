import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hasPostmark, postmarkHeading, postmarkLine, postmarkWrittenLine } from "@/lib/postmark";

const schema = z.object({
  stampText: z.string().max(160).optional().nullable(),
  postmarkedAt: z.string().optional().nullable(),
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
    heading: postmarkHeading(letter.title),
    line: postmarkLine(letter.stampText, letter.postmarkedAt),
    written: postmarkWrittenLine(letter.writtenAt, letter.stampText, letter.postmarkedAt),
    hasPostmark: hasPostmark(letter),
    letter,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A postmark needs a stamp or a date." }, { status: 400 });
  const existing = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const letter = await prisma.document.update({
    where: { id },
    data: {
      stampText: body.data.stampText === undefined ? existing.stampText : body.data.stampText?.trim() || null,
      postmarkedAt:
        body.data.postmarkedAt === undefined
          ? existing.postmarkedAt
          : body.data.postmarkedAt
            ? new Date(body.data.postmarkedAt)
            : null,
    },
  });
  return NextResponse.json({
    heading: postmarkHeading(letter.title),
    line: postmarkLine(letter.stampText, letter.postmarkedAt),
    written: postmarkWrittenLine(letter.writtenAt, letter.stampText, letter.postmarkedAt),
    hasPostmark: hasPostmark(letter),
    letter,
  });
}
