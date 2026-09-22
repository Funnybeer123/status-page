import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { VehicleForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileVehicles, vehicleLine, vehiclesHeading } from "@/lib/vehicles";

export default async function VehiclesPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.familyVehicle.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileVehicles(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      owner: row.person?.displayName,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="vehicles-heading">
        {vehiclesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Wagons, cars, and trucks, with the years the family owned them.{" "}
        <Link href="/vehicles/missing" className="text-seal">Empty vehicle log</Link>
      </p>
      {canWrite(ctx.role) ? (
        <VehicleForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="vehicles-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{vehicleLine(row.name, row.kind, row.years)}</p>
            {row.owner ? <p className="mt-2 text-bark">{row.owner}</p> : null}
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{vehiclesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={vehiclesHeading(compiled.length)} path="/vehicles" />
    </AppShell>
  );
}
