import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { plotHasPosition, plotPinLine, unmappedPlotsHeading } from "@/lib/cemeteryPlotMap";

export default async function UnmappedPlotsPage() {
  const ctx = await requireFamily();
  const plots = await prisma.cemeteryPlot.findMany({
    where: { cemetery: { familyId: ctx.family.id } },
    include: { person: true, cemetery: true },
  });
  const unmapped = plots.filter((plot) => !plotHasPosition(plot));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="unmapped-plots-heading">
        {unmappedPlotsHeading(unmapped.length)}
      </h1>
      <ul className="mt-10 space-y-3">
        {unmapped.map((plot) => (
          <li key={plot.id} className="paper-card p-5">
            <Link href={`/cemeteries/${plot.cemeteryId}`} className="font-display text-2xl text-seal">{plot.cemetery.name}</Link>
            <p className="text-bark">{plotPinLine(plot.person.displayName, plot.plot)}</p>
          </li>
        ))}
        {!unmapped.length ? <li className="text-bark">Every plot has a place on the map.</li> : null}
      </ul>
    </AppShell>
  );
}
