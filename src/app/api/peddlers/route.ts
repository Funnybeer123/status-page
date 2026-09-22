import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compilePeddlers, peddlerLine, peddlersHeading } from "@/lib/peddler";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  peddler: z.string().min(1).max(160),
  goods: z.string().min(1).max(160),
  buyerId: z.string(),
  visitedOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compilePeddlers(
    (await prisma.peddlerVisit.findMany({
      where: { familyId: ctx.family.id },
      include: { buyer: true },
    })).map((row) => ({
      id: row.id,
      peddler: row.peddler,
      goods: row.goods,
      buyer: row.buyer.displayName,
      visitedOn: row.visitedOn,
    })),
  );
  return NextResponse.json({ visits: rows, heading: peddlersHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who stopped, what they sold, and to whom?" }, { status: 400 });
  const buyer = await prisma.person.findFirst({
    where: { id: body.data.buyerId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!buyer) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.peddlerVisit.create({
    data: {
      familyId: ctx.family.id,
      peddler: body.data.peddler.trim(),
      goods: body.data.goods.trim(),
      buyerId: buyer.id,
      visitedOn: parseDate(body.data.visitedOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { buyer: true },
  });
  const line = peddlerLine(row.peddler, row.goods, row.buyer.displayName, row.visitedOn?.toISOString().slice(0, 10));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "peddler",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ visit: row, line });
}
