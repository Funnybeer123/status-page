import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { plotHasPosition, plotPinLine, unmappedPlotsHeading } from "@/lib/cemeteryPlotMap";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const plots = await prisma.cemeteryPlot.findMany({
    where: { cemetery: { familyId: ctx.family.id } },
    include: { person: true, cemetery: true },
  });
  const unmapped = plots.filter((plot) => !plotHasPosition(plot));
  return NextResponse.json({
    heading: unmappedPlotsHeading(unmapped.length),
    lines: unmapped.map((plot) => `${plot.cemetery.name} · ${plotPinLine(plot.person.displayName, plot.plot)}`),
    plots: unmapped,
  });
}
