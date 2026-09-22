import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileSeedOrders, seedOrderLine, seedOrdersHeading } from "@/lib/seedOrder";

const schema = z.object({
  personId: z.string(),
  variety: z.string().min(1).max(120),
  quantity: z.string().min(1).max(80),
  supplier: z.string().min(1).max(160),
  year: z.coerce.number().int().min(1800).max(2100).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileSeedOrders(
    (await prisma.seedOrder.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      variety: row.variety,
      quantity: row.quantity,
      supplier: row.supplier,
      year: row.year,
    })),
  );
  return NextResponse.json({ seeds: rows, heading: seedOrdersHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "What seed, how much, and from whom?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.seedOrder.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      variety: body.data.variety.trim(),
      quantity: body.data.quantity.trim(),
      supplier: body.data.supplier.trim(),
      year: body.data.year || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = seedOrderLine(row.variety, row.quantity, row.supplier);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "seed",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ seed: row, line });
}
