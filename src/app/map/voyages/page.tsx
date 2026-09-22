import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { voyageRoute, voyageRouteHeading, voyageRouteLine } from "@/lib/voyageRoute";

export default async function VoyageRoutesPage() {
  const ctx = await requireFamily();
  const voyages = await prisma.voyage.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { departedOn: "asc" },
  });
  const routed = voyages.map((voyage) => ({ voyage, route: voyageRoute(voyage) }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="voyage-routes-heading">Voyage routes</h1>
      <p className="mt-3 max-w-2xl text-bark">From the departure port to the arrival port, drawn on the family map.</p>
      <ul className="mt-10 space-y-3" data-testid="voyage-routes-list">
        {routed.map(({ voyage, route }) => (
          <li key={voyage.id} className="paper-card p-5">
            <Link href={`/map?voyageId=${voyage.id}`} className="font-display text-2xl text-seal">
              {voyageRouteHeading(voyage.ship, voyage.departedFrom, voyage.arrivedAt)}
            </Link>
            <p className="text-bark">{voyageRouteLine(voyage.departedFrom, voyage.arrivedAt)}</p>
            {route ? <p className="font-sans text-sm text-gold">Route can be drawn</p> : <p className="font-sans text-sm text-bark">Ports are not on the map yet</p>}
          </li>
        ))}
        {!voyages.length ? <li className="text-bark">No voyages recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
