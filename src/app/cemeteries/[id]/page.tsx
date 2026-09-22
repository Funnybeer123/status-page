import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PlotForm } from "@/app/cemeteries/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { plotHasPosition, plotMapHeading, plotPinLine } from "@/lib/cemeteryPlotMap";

export default async function CemeteryPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [cemetery, people] = await Promise.all([
    prisma.cemetery.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { plots: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!cemetery) notFound();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Cemetery</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="cemetery-name">{cemetery.name}</h1>
      <p className="mt-3 text-bark">
        {[cemetery.locality, cemetery.region, cemetery.country].filter(Boolean).join(", ")}
      </p>
      {cemetery.notes ? <p className="mt-2 text-bark">{cemetery.notes}</p> : null}
      <p className="mt-4 font-sans text-sm">
        <Link href={`/cemeteries/${cemetery.id}/map`} className="text-seal" data-testid="cemetery-plot-map-link">
          Plot map
        </Link>
        {" · "}
        <Link href="/cemeteries/unmapped" className="text-seal">Plots missing a place</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PlotForm cemeteryId={cemetery.id} people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      {cemetery.plots.some((plot) => plotHasPosition(plot)) ? (
        <section className="mt-10" data-testid="cemetery-plot-map">
          <h2 className="font-display text-3xl">
            {plotMapHeading(cemetery.name, cemetery.plots.filter((plot) => plotHasPosition(plot)).length)}
          </h2>
          <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border border-bark/15 bg-[linear-gradient(180deg,#e8e0d2,#d5cbb8)]">
            {cemetery.plots.filter((plot) => plotHasPosition(plot)).map((plot) => (
              <Link
                key={plot.id}
                href={`/people/${plot.personId}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-seal px-2 py-1 font-sans text-xs text-cream"
                style={{ left: `${plot.x}%`, top: `${plot.y}%` }}
                title={plotPinLine(plot.person.displayName, plot.plot)}
              >
                {plot.plot || plot.person.displayName}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="cemetery-plots">
        {cemetery.plots.map((plot) => (
          <li key={plot.id} className="paper-card p-5">
            <Link href={`/people/${plot.personId}`} className="font-display text-2xl text-seal">{plot.person.displayName}</Link>
            <p className="text-bark">Plot {plot.plot || "unmarked"}</p>
            {plot.notes ? <p className="text-bark">{plot.notes}</p> : null}
            {!plot.person.deathDate ? null : (
              <Link href={`/people/${plot.personId}/memorial`} className="mt-2 inline-block font-sans text-sm text-seal">
                Linked memorial
              </Link>
            )}
          </li>
        ))}
        {!cemetery.plots.length ? <li className="text-bark">No plots recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
