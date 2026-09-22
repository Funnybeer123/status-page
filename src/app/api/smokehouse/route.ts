import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileSmokehouse, smokehouseHeading, smokehouseLine } from "@/lib/smokehouse";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  item: z.string().min(1).max(160),
  hungOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileSmokehouse(
    (await prisma.smokehouseItem.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      item: row.item,
      hungOn: row.hungOn,
    })),
  );
  return NextResponse.json({ items: rows, heading: smokehouseHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "What was hanging, and whose meat?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.smokehouseItem.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      item: body.data.item.trim(),
      hungOn: parseDate(body.data.hungOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = smokehouseLine(row.item, row.person.displayName, row.hungOn?.toISOString().slice(0, 10));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "smokehouse",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ item: row, line });
}
