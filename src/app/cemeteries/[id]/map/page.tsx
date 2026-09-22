import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { plotHasPosition, plotMapHeading, plotPinLine, unmappedPlotsHeading } from "@/lib/cemeteryPlotMap";

export default async function CemeteryPlotMapPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const cemetery = await prisma.cemetery.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { plots: { include: { person: true } } },
  });
  if (!cemetery) notFound();
  const mapped = cemetery.plots.filter((plot) => plotHasPosition(plot));
  const unmapped = cemetery.plots.filter((plot) => !plotHasPosition(plot));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Cemetery plot map</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="plot-map-heading">
        {plotMapHeading(cemetery.name, mapped.length)}
      </h1>
      <p className="mt-3 text-bark">
        Who is buried in each plot.{" "}
        <Link href={`/cemeteries/${cemetery.id}`} className="text-seal">Back to {cemetery.name}</Link>.
      </p>
      <div className="relative mt-10 aspect-[4/3] overflow-hidden rounded-2xl border border-bark/15 bg-[linear-gradient(180deg,#e8e0d2,#d5cbb8)]" data-testid="plot-map">
        {mapped.map((plot) => (
          <Link
            key={plot.id}
            href={`/people/${plot.personId}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-seal px-2 py-1 font-sans text-xs text-cream"
            style={{ left: `${plot.x}%`, top: `${plot.y}%` }}
          >
            {plotPinLine(plot.person.displayName, plot.plot)}
          </Link>
        ))}
      </div>
      {unmapped.length ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl">{unmappedPlotsHeading(unmapped.length)}</h2>
          <ul className="mt-4 space-y-2">
            {unmapped.map((plot) => (
              <li key={plot.id} className="paper-card p-4">
                <Link href={`/people/${plot.personId}`} className="text-seal">{plot.person.displayName}</Link>
                <p className="text-bark">{plot.plot || "unmarked"}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
