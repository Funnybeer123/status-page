import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { MilkRouteForm, MilkStopForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileMilkStops, milkRouteHeading, milkRoutesHeading, milkStopLine } from "@/lib/milkRoute";

export default async function MilkPage() {
  const ctx = await requireFamily();
  const [routes, people] = await Promise.all([
    prisma.milkRoute.findMany({
      where: { familyId: ctx.family.id },
      include: { stops: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="milk-heading">
        {milkRoutesHeading(routes.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The dairy route and whose porch came in which order.{" "}
        <Link href="/milk/missing" className="text-seal">Empty milk route</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <MilkRouteForm />
          <MilkStopForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            routes={routes.map((route) => ({ id: route.id, name: route.name }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="milk-list">
        {routes.map((route) => {
          const stops = compileMilkStops(
            route.stops.map((stop) => ({
              id: stop.id,
              person: stop.person.displayName,
              stopOrder: stop.stopOrder,
            })),
          );
          return (
            <li key={route.id} className="paper-card p-8">
              <p className="font-display text-3xl">{milkRouteHeading(route.name, stops.length)}</p>
              <ol className="mt-4 space-y-2">
                {stops.map((stop) => (
                  <li key={stop.id} className="text-bark">{milkStopLine(stop.person, stop.stopOrder)}</li>
                ))}
              </ol>
            </li>
          );
        })}
        {!routes.length ? <li className="text-bark">{milkRoutesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={milkRoutesHeading(routes.length)} path="/milk" />
    </AppShell>
  );
}
