import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideEventFromViewer } from "@/lib/privacy";
import { barePreferredHeading, compilePreferredDates } from "@/lib/factConfidence";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const events = await prisma.lifeEvent.findMany({
    where: { familyId: ctx.family.id, preferred: true },
    include: { person: true, citations: true },
  });
  const bare = events.filter((event) => !hideEventFromViewer(ctx.role, event) && !event.citations.length);
  const items = compilePreferredDates(bare);
  return NextResponse.json({ heading: barePreferredHeading(items.length), items });
}
