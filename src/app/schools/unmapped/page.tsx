import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { clusterSchools, unmappedSchoolsHeading } from "@/lib/schoolMap";

export default async function UnmappedSchoolsPage() {
  const ctx = await requireFamily();
  const schools = await prisma.schooling.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
  });
  const mapped = new Set(clusterSchools(schools).map((cluster) => cluster.school.toLowerCase()));
  const missing = schools.filter((row) => !mapped.has(row.school.trim().toLowerCase()));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="unmapped-schools-heading">
        {unmappedSchoolsHeading(missing.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Schools that do not yet have a place the map can find.{" "}
        <Link href="/schools/map" className="text-seal">School map</Link>.
      </p>
      <ul className="mt-10 space-y-3">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.school}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.place ? ` · ${row.place}` : " · no place yet"}
            </p>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every school has a place on the map.</li> : null}
      </ul>
    </AppShell>
  );
}
