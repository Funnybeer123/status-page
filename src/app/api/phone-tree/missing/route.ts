import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { missingPhoneHeading } from "@/lib/phoneTree";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, contacts] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, ...alive, deathDate: null },
      orderBy: { displayName: "asc" },
    }),
    prisma.familyPhoneContact.findMany({
      where: { familyId: ctx.family.id },
      select: { personId: true },
    }),
  ]);
  const listed = new Set(contacts.map((row) => row.personId));
  const missing = people
    .filter((person) => !listed.has(person.id) && !hideMinorDetails(ctx.role, person))
    .map((person) => ({ id: person.id, displayName: person.displayName }));
  return NextResponse.json({ heading: missingPhoneHeading(missing.length), people: missing });
}
