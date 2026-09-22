import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileCreamery, creameryHeading, creameryLine } from "@/lib/creameryCheck";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  pounds: z.string().min(1).max(40),
  amount: z.string().min(1).max(40),
  paidOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileCreamery(
    (await prisma.creameryCheck.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      pounds: row.pounds,
      amount: row.amount,
      paidOn: row.paidOn,
    })),
  );
  return NextResponse.json({ checks: rows, heading: creameryHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Whose cream, how many pounds, and what was paid?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.creameryCheck.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      pounds: body.data.pounds.trim(),
      amount: body.data.amount.trim(),
      paidOn: parseDate(body.data.paidOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = creameryLine(row.person.displayName, row.pounds, row.amount, row.paidOn?.toISOString().slice(0, 10));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "creamery",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ check: row, line });
}
