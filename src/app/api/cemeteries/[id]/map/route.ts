import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { plotHasPosition, plotMapHeading, plotPinLine, unmappedPlotsHeading } from "@/lib/cemeteryPlotMap";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const cemetery = await prisma.cemetery.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { plots: { include: { person: true } } },
  });
  if (!cemetery) return NextResponse.json({ error: "Cemetery not found." }, { status: 404 });
  const mapped = cemetery.plots.filter((plot) => plotHasPosition(plot));
  const unmapped = cemetery.plots.filter((plot) => !plotHasPosition(plot));
  return NextResponse.json({
    cemetery,
    heading: plotMapHeading(cemetery.name, mapped.length),
    unmappedHeading: unmappedPlotsHeading(unmapped.length),
    plots: mapped.map((plot) => ({
      id: plot.id,
      x: plot.x,
      y: plot.y,
      plot: plot.plot,
      personId: plot.personId,
      name: plot.person.displayName,
      line: plotPinLine(plot.person.displayName, plot.plot),
    })),
    unmapped: unmapped.map((plot) => ({
      id: plot.id,
      personId: plot.personId,
      name: plot.person.displayName,
      plot: plot.plot,
      line: plotPinLine(plot.person.displayName, plot.plot),
    })),
  });
}
