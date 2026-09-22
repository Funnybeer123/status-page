import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideEventFromViewer } from "@/lib/privacy";
import { compilePreferredDates, preferredDatesHeading } from "@/lib/factConfidence";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const events = await prisma.lifeEvent.findMany({
    where: { familyId: ctx.family.id, preferred: true },
    include: { person: true, citations: true },
    orderBy: { happenedOn: "asc" },
  });
  const visible = events.filter((event) => !hideEventFromViewer(ctx.role, event));
  const items = compilePreferredDates(visible);
  return NextResponse.json({ heading: preferredDatesHeading(items.length), items });
}
