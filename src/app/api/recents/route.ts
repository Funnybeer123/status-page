import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { recentsHeading, recentLine, sortRecents } from "@/lib/recents";
import { hideMinorDetails } from "@/lib/privacy";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const visits = await prisma.personVisit.findMany({
    where: { userId: ctx.session.user.id, familyId: ctx.family.id, person: { ...alive } },
    include: { person: true },
    orderBy: { openedAt: "desc" },
    take: 12,
  });
  const visible = sortRecents(visits).filter((visit) => !hideMinorDetails(ctx.role, visit.person));
  return NextResponse.json({
    visits: visible,
    heading: recentsHeading(visible.length),
    lines: visible.map((visit) => recentLine(visit.person.displayName)),
  });
}
