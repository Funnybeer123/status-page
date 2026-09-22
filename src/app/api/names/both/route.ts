import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { bothNamesHeading, maidenNameLine, marriedNameLine } from "@/lib/nameSearch";
import { hideMinorDetails } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    include: { names: true },
    orderBy: { displayName: "asc" },
  });
  const rows = people
    .filter((person) => !hideMinorDetails(ctx.role, person))
    .filter((person) => person.names.some((name) => name.kind === "maiden") && (person.familyName || person.displayName))
    .map((person) => {
      const maiden = person.names.find((name) => name.kind === "maiden");
      return {
        id: person.id,
        displayName: person.displayName,
        familyName: person.familyName,
        maiden: maiden?.name ?? null,
        maidenLine: maidenNameLine(person.displayName, maiden?.name),
        marriedLine: marriedNameLine(person.displayName, person.familyName),
      };
    });
  return NextResponse.json({ people: rows, heading: bothNamesHeading(rows.length) });
}
