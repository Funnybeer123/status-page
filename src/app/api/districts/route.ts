import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileDistricts, districtYears, roadDistrictLine, roadDistrictsHeading } from "@/lib/roadDistrict";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  district: z.string().min(1).max(160),
  startedOn: z.string().optional(),
  endedOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileDistricts(
    (await prisma.roadDistrict.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      district: row.district,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
    })),
  );
  return NextResponse.json({ districts: rows, heading: roadDistrictsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who oversaw which district?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.roadDistrict.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      district: body.data.district.trim(),
      startedOn: parseDate(body.data.startedOn),
      endedOn: parseDate(body.data.endedOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = roadDistrictLine(row.person.displayName, row.district, districtYears(row.startedOn, row.endedOn));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "district",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ district: row, line });
}
