import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { isOralHistory, missingOralHeading } from "@/lib/oralPlaylist";
import { hideMinorDetails } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    include: { tags: { include: { asset: true } } },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter(
    (person) => !hideMinorDetails(ctx.role, person) && !person.tags.some((tag) => tag.asset && isOralHistory(tag.asset)),
  );
  return NextResponse.json({
    heading: missingOralHeading(missing.length),
    people: missing.map((person) => ({ id: person.id, displayName: person.displayName })),
  });
}
