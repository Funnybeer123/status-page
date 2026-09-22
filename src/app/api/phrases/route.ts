import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compilePhrases, phraseLine, phrasesHeading } from "@/lib/phrasebook";

const schema = z.object({
  phrase: z.string().min(1).max(200),
  meaning: z.string().min(1).max(400),
  language: z.string().max(40).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compilePhrases(await prisma.familyPhrase.findMany({ where: { familyId: ctx.family.id } }));
  return NextResponse.json({ phrases: rows, heading: phrasesHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A phrase needs the saying and what it means." }, { status: 400 });
  const phrase = await prisma.familyPhrase.create({
    data: {
      familyId: ctx.family.id,
      phrase: body.data.phrase.trim(),
      meaning: body.data.meaning.trim(),
      language: body.data.language?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
  });
  const line = phraseLine(phrase.phrase, phrase.meaning);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "phrase",
    entityId: phrase.id,
    title: phrase.phrase,
    summary: line,
  });
  return NextResponse.json({ phrase, line });
}
