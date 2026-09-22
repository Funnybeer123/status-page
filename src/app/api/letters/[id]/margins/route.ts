import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileMarginNotes, letterLines, marginNoteLine, marginsHeading } from "@/lib/marginNotes";

const schema = z.object({
  line: z.coerce.number().int().min(1).max(400),
  body: z.string().min(1).max(400),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { marginNotes: { include: { author: { select: { name: true } } } } },
  });
  if (!letter) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const notes = compileMarginNotes(
    letter.marginNotes.map((note) => ({
      id: note.id,
      line: note.line,
      body: note.body,
      author: note.author.name,
    })),
  );
  return NextResponse.json({
    notes,
    lines: letterLines(letter.transcript),
    heading: marginsHeading(letter.title, notes.length),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Pin a short note to a line." }, { status: 400 });
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!letter) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  const lines = letterLines(letter.transcript);
  if (body.data.line > Math.max(lines.length, 1)) {
    return NextResponse.json({ error: "That line is past the end of the letter." }, { status: 400 });
  }
  const note = await prisma.letterMarginNote.create({
    data: {
      familyId: ctx.family.id,
      documentId: letter.id,
      authorId: ctx.session.user.id,
      line: body.data.line,
      body: body.data.body.trim(),
    },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json({
    note,
    line: marginNoteLine(note.line, note.author.name, note.body),
  });
}
