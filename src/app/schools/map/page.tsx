import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { clusterSchools, schoolMapHeading, schoolPinLine } from "@/lib/schoolMap";
import { mapBounds, projectPoint } from "@/lib/geocode";

export default async function SchoolMapPage() {
  const ctx = await requireFamily();
  const schools = await prisma.schooling.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
  });
  const clusters = clusterSchools(schools);
  const bounds = mapBounds(clusters);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="school-map-heading">
        {schoolMapHeading(clusters.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Schools the family attended, plotted from the places already written down.{" "}
        <Link href="/schools" className="text-seal">School list</Link>
        {" · "}
        <Link href="/schools/unmapped" className="text-seal">Missing places</Link>.
      </p>
      {bounds ? (
        <svg viewBox="0 0 720 420" className="mt-8 w-full rounded-2xl bg-paper" data-testid="school-map">
          {clusters.map((cluster) => {
            const point = projectPoint(cluster, bounds, 720, 420);
            return (
              <g key={`${cluster.school}-${cluster.place}`}>
                <circle cx={point.x} cy={point.y} r={10} fill="#8b3a2a" opacity="0.8" />
                <text x={point.x + 14} y={point.y + 4} fontSize="12" fill="#2b2118">
                  {cluster.school}
                </text>
              </g>
            );
          })}
        </svg>
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="school-clusters">
        {clusters.map((cluster) => (
          <li key={`${cluster.school}-${cluster.place}`} className="paper-card p-5">
            <p className="font-display text-2xl">{schoolPinLine(cluster.school, cluster.place, cluster.count)}</p>
            <p className="mt-2 font-sans text-sm text-bark">
              {cluster.people.map((person, index) => (
                <span key={person.id}>
                  {index ? " · " : ""}
                  <Link href={`/people/${person.id}`} className="text-seal">
                    {person.displayName}
                  </Link>
                </span>
              ))}
            </p>
          </li>
        ))}
        {!clusters.length ? <li className="text-bark">Add a school with a place to see it on the map.</li> : null}
      </ul>
    </AppShell>
  );
}
