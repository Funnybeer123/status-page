import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { IceForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileIceHarvest, iceHarvestHeading, iceHarvestLine } from "@/lib/iceHarvest";

export default async function IcePage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.iceHarvestCrew.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileIceHarvest(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      year: row.year,
      place: row.place,
      role: row.role,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="ice-heading">
        {iceHarvestHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who worked the winter ice, and in what year.{" "}
        <Link href="/ice/missing" className="text-seal">Empty ice-harvest crew</Link>
        {" · "}
        <Link href="/hymns" className="text-seal">Family hymns</Link>
      </p>
      {canWrite(ctx.role) ? (
        <IceForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="ice-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{iceHarvestLine(row.person, row.year, row.role)}</p>
            {row.place ? <p className="mt-2 text-bark">{row.place}</p> : null}
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{iceHarvestHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={iceHarvestHeading(compiled.length)} path="/ice" />
    </AppShell>
  );
}
