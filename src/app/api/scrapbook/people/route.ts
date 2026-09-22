import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { peopleWithoutFirstsHeading } from "@/lib/scrapbook";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, tagged] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id, firstTag: { not: null } },
      select: { personId: true },
    }),
  ]);
  const taggedIds = new Set(tagged.map((event) => event.personId));
  const missing = people
    .filter((person) => !taggedIds.has(person.id) && !hideMinorDetails(ctx.role, person))
    .map((person) => ({ id: person.id, displayName: person.displayName }));
  return NextResponse.json({ heading: peopleWithoutFirstsHeading(missing.length), people: missing });
}
