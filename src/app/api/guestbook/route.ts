import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { guestBookHeading, guestBookLine } from "@/lib/guestBook";

const schema = z.object({
  body: z.string().min(1).max(2000),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const notes = await prisma.homeGuestBook.findMany({
    where: { familyId: ctx.family.id },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    heading: guestBookHeading(notes.length),
    notes: notes.map((note) => ({
      id: note.id,
      body: note.body,
      author: note.author.name,
      line: guestBookLine(note.author.name, note.body),
    })),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A guest book note needs a few words." }, { status: 400 });
  const note = await prisma.homeGuestBook.create({
    data: {
      familyId: ctx.family.id,
      authorId: ctx.session.user.id,
      body: body.data.body.trim(),
    },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json({
    heading: guestBookHeading(1),
    note: {
      id: note.id,
      body: note.body,
      author: note.author.name,
      line: guestBookLine(note.author.name, note.body),
    },
  });
}
