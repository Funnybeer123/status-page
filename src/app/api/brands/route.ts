import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { brandYears, cattleBrandLine, cattleBrandsHeading, compileBrands } from "@/lib/cattleBrand";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  mark: z.string().min(1).max(80),
  startedOn: z.string().optional(),
  endedOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileBrands(
    (await prisma.cattleBrand.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      mark: row.mark,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
    })),
  );
  return NextResponse.json({ brands: rows, heading: cattleBrandsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "What mark, whose stock, and which years?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.cattleBrand.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      mark: body.data.mark.trim(),
      startedOn: parseDate(body.data.startedOn),
      endedOn: parseDate(body.data.endedOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = cattleBrandLine(row.mark, row.person.displayName, brandYears(row.startedOn, row.endedOn));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "brand",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ brand: row, line });
}
