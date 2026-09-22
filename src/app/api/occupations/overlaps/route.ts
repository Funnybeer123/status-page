import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { familyOverlapsHeading, overlappingPairs, sortOccupations } from "@/lib/occupations";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const records = await prisma.occupationRecord.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
  });
  const byPerson = new Map<string, typeof records>();
  for (const row of records) {
    const list = byPerson.get(row.personId) ?? [];
    list.push(row);
    byPerson.set(row.personId, list);
  }
  const people = [...byPerson.entries()]
    .map(([personId, jobs]) => {
      const pairs = overlappingPairs(sortOccupations(jobs));
      const person = jobs[0]?.person;
      return {
        personId,
        name: person?.displayName ?? "Someone",
        lines: pairs.map((pair) => pair.line),
        count: pairs.length,
      };
    })
    .filter((row) => row.count);
  return NextResponse.json({
    heading: familyOverlapsHeading(people.length),
    people,
  });
}
