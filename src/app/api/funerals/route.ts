import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { funeralDates, funeralHeading, funeralsHeading } from "@/lib/funeral";
import { portraitAssetId } from "@/lib/portraits";
import { isLiving } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, deathDate: { not: null } },
    include: { tags: true },
    orderBy: { displayName: "asc" },
  });
  const programs = people
    .filter((person) => !isLiving(person))
    .map((person) => ({
      id: person.id,
      displayName: person.displayName,
      heading: funeralHeading(person.displayName),
      dates: funeralDates(person.birthDate, person.deathDate),
      portraitAssetId: portraitAssetId(person, person.tags),
      href: `/people/${person.id}/funeral`,
    }));
  return NextResponse.json({ programs, heading: funeralsHeading(programs.length) });
}
