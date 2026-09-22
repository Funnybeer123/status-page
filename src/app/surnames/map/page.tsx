import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { clusterSurnames, surnameClusterLine, surnameMapHeading } from "@/lib/surnameMap";
import { hideResidenceForViewer } from "@/lib/privacy";
import { mapBounds, projectPoint } from "@/lib/geocode";

export default async function SurnameMapPage() {
  const ctx = await requireFamily();
  const [people, residences] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, ...alive },
      include: { names: true },
    }),
    prisma.residence.findMany({
      where: { familyId: ctx.family.id, person: { ...alive } },
      include: { place: true, person: true },
    }),
  ]);
  const visibleHomes = residences.filter((row) => !hideResidenceForViewer(ctx.role, row.person));
  const clusters = clusterSurnames(people, visibleHomes);
  const bounds = mapBounds(clusters);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="surname-map-heading">
        {surnameMapHeading(clusters.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Where each surname clustered, from the residences already on the tree.{" "}
        <Link href="/surnames" className="text-seal">Surname index</Link>.
      </p>
      {bounds ? (
        <svg viewBox="0 0 720 420" className="mt-8 w-full rounded-2xl bg-paper" data-testid="surname-map">
          {clusters.map((cluster) => {
            const point = projectPoint(cluster, bounds, 720, 420);
            return (
              <g key={`${cluster.surname}-${cluster.place}`}>
                <circle cx={point.x} cy={point.y} r={8 + cluster.count} fill="#8b3a2a" opacity="0.75" />
                <text x={point.x + 14} y={point.y + 4} fontSize="12" fill="#2b2118">
                  {cluster.surname}
                </text>
              </g>
            );
          })}
        </svg>
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="surname-clusters">
        {clusters.map((cluster) => (
          <li key={`${cluster.surname}-${cluster.place}`} className="paper-card p-5">
            <p className="font-display text-2xl">{surnameClusterLine(cluster.surname, cluster.place, cluster.count)}</p>
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
        {!clusters.length ? <li className="text-bark">Add residences to see where surnames clustered.</li> : null}
      </ul>
    </AppShell>
  );
}
