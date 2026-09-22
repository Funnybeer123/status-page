import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { vaultDenied, vaultHeading, vaultLine } from "@/lib/vault";

const schema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(4000),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  if (ctx.role !== Role.owner) {
    return NextResponse.json({ error: vaultDenied() }, { status: 403 });
  }
  const notes = await prisma.familyVaultNote.findMany({
    where: { familyId: ctx.family.id },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    heading: vaultHeading(notes.length),
    notes: notes.map((note) => ({
      id: note.id,
      title: vaultLine(note.title),
      body: note.body,
      createdBy: note.createdBy.name,
    })),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  if (ctx.role !== Role.owner) {
    return NextResponse.json({ error: vaultDenied() }, { status: 403 });
  }
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A vault note needs a title and the shared account words." }, { status: 400 });
  const note = await prisma.familyVaultNote.create({
    data: {
      familyId: ctx.family.id,
      title: body.data.title.trim(),
      body: body.data.body.trim(),
      createdById: ctx.session.user.id,
    },
    include: { createdBy: { select: { name: true } } },
  });
  return NextResponse.json({
    heading: vaultHeading(1),
    note: {
      id: note.id,
      title: vaultLine(note.title),
      body: note.body,
      createdBy: note.createdBy.name,
    },
  });
}
