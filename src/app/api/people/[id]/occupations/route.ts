import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { occupationLine, occupationTimelineHeading, overlappingPairs, overlapHeading, sortOccupations } from "@/lib/occupations";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({ where: { id, familyId: ctx.family.id, ...alive } });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const records = sortOccupations(
    await prisma.occupationRecord.findMany({ where: { familyId: ctx.family.id, personId: person.id } }),
  );
  const overlaps = overlappingPairs(records);
  return NextResponse.json({
    person,
    records,
    heading: occupationTimelineHeading(person.displayName, records.length),
    lines: records.map((row) => occupationLine(row.title, row.employer, row.startedOn, row.endedOn)),
    overlapHeading: overlapHeading(overlaps.length),
    overlaps: overlaps.map((pair) => pair.line),
  });
}
