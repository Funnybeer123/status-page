import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileMidwives, midwifeLine, midwivesHeading } from "@/lib/midwife";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  midwifeId: z.string(),
  motherId: z.string(),
  childId: z.string().optional(),
  attendedOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileMidwives(
    (await prisma.midwifeRecord.findMany({
      where: { familyId: ctx.family.id },
      include: { midwife: true, mother: true, child: true },
    })).map((row) => ({
      id: row.id,
      midwife: row.midwife.displayName,
      mother: row.mother.displayName,
      child: row.child?.displayName,
      attendedOn: row.attendedOn,
    })),
  );
  return NextResponse.json({ midwives: rows, heading: midwivesHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who attended, and which mother?" }, { status: 400 });
  const [midwife, mother, child] = await Promise.all([
    prisma.person.findFirst({ where: { id: body.data.midwifeId, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findFirst({ where: { id: body.data.motherId, familyId: ctx.family.id, deletedAt: null } }),
    body.data.childId
      ? prisma.person.findFirst({ where: { id: body.data.childId, familyId: ctx.family.id, deletedAt: null } })
      : Promise.resolve(null),
  ]);
  if (!midwife || !mother) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  if (body.data.childId && !child) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.midwifeRecord.create({
    data: {
      familyId: ctx.family.id,
      midwifeId: midwife.id,
      motherId: mother.id,
      childId: child?.id || null,
      attendedOn: parseDate(body.data.attendedOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { midwife: true, mother: true, child: true },
  });
  const line = midwifeLine(
    row.midwife.displayName,
    row.mother.displayName,
    row.child?.displayName,
    row.attendedOn?.toISOString().slice(0, 10),
  );
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "midwife",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ midwife: row, line });
}
