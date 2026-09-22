import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideEventFromViewer } from "@/lib/privacy";
import { compileScrapbook, undatedFirstsHeading } from "@/lib/scrapbook";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const events = await prisma.lifeEvent.findMany({
    where: { familyId: ctx.family.id, firstTag: { not: null }, happenedOn: null },
    include: { person: true },
  });
  const items = compileScrapbook(events.filter((event) => !hideEventFromViewer(ctx.role, event)));
  return NextResponse.json({ heading: undatedFirstsHeading(items.length), items });
}
