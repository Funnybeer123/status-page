import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingFuneralPortraitHeading } from "@/lib/funeral";
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
  const missing = people
    .filter((person) => !isLiving(person) && !portraitAssetId(person, person.tags))
    .map((person) => ({ id: person.id, displayName: person.displayName, href: `/people/${person.id}` }));
  return NextResponse.json({ missing, heading: missingFuneralPortraitHeading(missing.length) });
}
