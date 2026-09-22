import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { milestoneBirthdays, milestoneHeading } from "@/lib/milestones";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const year = Number.parseInt(new URL(req.url).searchParams.get("year") || "", 10) || new Date().getUTCFullYear();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    select: { id: true, displayName: true, birthDate: true, deathDate: true },
  });
  const rows = milestoneBirthdays(people, year);
  return NextResponse.json({ year, milestones: rows, heading: milestoneHeading(year, rows.length) });
}
