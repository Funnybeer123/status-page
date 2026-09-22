import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { rsvpCardHeading, rsvpCardsHeading, rsvpWhenLine } from "@/lib/rsvpCard";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: true },
    orderBy: { happenedOn: "asc" },
  });
  const items = reunions
    .filter((reunion) => reunion.guests.length)
    .map((reunion) => ({
      id: reunion.id,
      title: reunion.title,
      heading: rsvpCardHeading(reunion.title),
      when: rsvpWhenLine(reunion.title, reunion.happenedOn, reunion.place),
      href: `/reunions/${reunion.id}/rsvp-card`,
    }));
  return NextResponse.json({ heading: rsvpCardsHeading(items.length), reunions: items });
}
