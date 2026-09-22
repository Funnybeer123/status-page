import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileSpellings, spellingLine, spellingsHeading } from "@/lib/surnameSpellings";

const schema = z.object({
  surname: z.string().min(1).max(80),
  variant: z.string().min(1).max(80),
  source: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileSpellings(await prisma.surnameSpelling.findMany({ where: { familyId: ctx.family.id } }));
  return NextResponse.json({ spellings: rows, heading: spellingsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A surname and a variant are required." }, { status: 400 });
  const row = await prisma.surnameSpelling.create({
    data: {
      familyId: ctx.family.id,
      surname: body.data.surname.trim(),
      variant: body.data.variant.trim(),
      source: body.data.source?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
  });
  const line = spellingLine(row.surname, row.variant, row.source);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "spelling",
    entityId: row.id,
    title: row.surname,
    summary: line,
  });
  return NextResponse.json({ spelling: row, line });
}
