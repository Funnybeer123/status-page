import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingRsvpHeading } from "@/lib/rsvpCard";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: true },
    orderBy: { title: "asc" },
  });
  const missing = reunions
    .filter((reunion) => !reunion.guests.length)
    .map((reunion) => ({ id: reunion.id, title: reunion.title, href: `/reunions/${reunion.id}` }));
  return NextResponse.json({ heading: missingRsvpHeading(missing.length), reunions: missing });
}
