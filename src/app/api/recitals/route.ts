import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { christmasPartLine, compileRecitals, recitalsHeading } from "@/lib/christmasPart";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  piece: z.string().min(1).max(160),
  kind: z.string().min(1).max(40),
  heldOn: z.string().optional(),
  place: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileRecitals(
    (await prisma.christmasPart.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      piece: row.piece,
      kind: row.kind,
      heldOn: row.heldOn,
      place: row.place,
    })),
  );
  return NextResponse.json({ parts: rows, heading: recitalsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who recited or sang, and which piece?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.christmasPart.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      piece: body.data.piece.trim(),
      kind: body.data.kind.trim(),
      heldOn: parseDate(body.data.heldOn),
      place: body.data.place?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = christmasPartLine(row.person.displayName, row.kind, row.piece, row.heldOn?.toISOString().slice(0, 10));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "recital",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ part: row, line });
}
