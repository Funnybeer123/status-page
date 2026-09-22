import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { butterMoldLine, compileMolds, moldsHeading } from "@/lib/butterMold";

const schema = z.object({
  personId: z.string(),
  mark: z.string().min(1).max(80),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileMolds(
    (await prisma.butterMold.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      mark: row.mark,
    })),
  );
  return NextResponse.json({ molds: rows, heading: moldsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Whose mold, and which mark?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.butterMold.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      mark: body.data.mark.trim(),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = butterMoldLine(row.person.displayName, row.mark);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "mold",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ mold: row, line });
}
