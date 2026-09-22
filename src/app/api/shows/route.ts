import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileShows, medicineShowLine, showsHeading } from "@/lib/medicineShow";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  item: z.string().min(1).max(160),
  show: z.string().min(1).max(160),
  boughtOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileShows(
    (await prisma.medicineShowBuy.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      item: row.item,
      show: row.show,
      boughtOn: row.boughtOn,
    })),
  );
  return NextResponse.json({ buys: rows, heading: showsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who bought what, and at which show?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.medicineShowBuy.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      item: body.data.item.trim(),
      show: body.data.show.trim(),
      boughtOn: parseDate(body.data.boughtOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = medicineShowLine(row.person.displayName, row.item, row.show, row.boughtOn?.toISOString().slice(0, 10));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "show",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ buy: row, line });
}
