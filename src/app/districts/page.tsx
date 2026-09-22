import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { DistrictForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileDistricts, districtYears, roadDistrictLine, roadDistrictsHeading } from "@/lib/roadDistrict";

export default async function DistrictsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.roadDistrict.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileDistricts(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      district: row.district,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="districts-heading">
        {roadDistrictsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The township road district: overseer, district, and term.{" "}
        <Link href="/road-tax" className="text-seal">Road tax</Link>
        {" · "}
        <Link href="/districts/missing" className="text-seal">Missing district</Link>
      </p>
      {canWrite(ctx.role) ? (
        <DistrictForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="districts-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{roadDistrictLine(row.person, row.district, districtYears(row.startedOn, row.endedOn))}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{roadDistrictsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={roadDistrictsHeading(compiled.length)} path="/districts" />
    </AppShell>
  );
}
