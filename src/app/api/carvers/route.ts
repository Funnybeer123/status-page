import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { carverLine, carversHeading, compileCarvers } from "@/lib/headstoneCarver";

const schema = z.object({
  carverId: z.string(),
  personId: z.string(),
  yard: z.string().min(1).max(160),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileCarvers(
    (await prisma.headstoneCarver.findMany({
      where: { familyId: ctx.family.id },
      include: { carver: true, person: true },
    })).map((row) => ({
      id: row.id,
      carver: row.carver.displayName,
      person: row.person.displayName,
      yard: row.yard,
    })),
  );
  return NextResponse.json({ carvers: rows, heading: carversHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who carved the stone, for whom, and in which yard?" }, { status: 400 });
  const [carver, person] = await Promise.all([
    prisma.person.findFirst({ where: { id: body.data.carverId, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!carver || !person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.headstoneCarver.create({
    data: {
      familyId: ctx.family.id,
      carverId: carver.id,
      personId: person.id,
      yard: body.data.yard.trim(),
      notes: body.data.notes?.trim() || null,
    },
    include: { carver: true, person: true },
  });
  const line = carverLine(row.carver.displayName, row.person.displayName, row.yard);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "carver",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ carver: row, line });
}
