import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PlotForm } from "@/app/cemeteries/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

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
      {canWrite(ctx.role) ? (
        <PlotForm cemeteryId={cemetery.id} people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
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
