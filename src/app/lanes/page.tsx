import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileMemoryLane, lanesIndexHeading, memoryLaneHeading } from "@/lib/memoryLane";

export default async function LanesIndexPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { residences: { include: { place: { include: { photos: true } } } } },
    orderBy: { displayName: "asc" },
  });
  const items = people
    .filter((person) => person.residences.length && !hideResidenceForViewer(ctx.role, person))
    .map((person) => ({
      id: person.id,
      displayName: person.displayName,
      heading: memoryLaneHeading(person.displayName),
      stops: compileMemoryLane(person.residences).length,
    }));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="lanes-heading">
        {lanesIndexHeading(items.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Every walk of the places a person lived.{" "}
        <Link href="/lanes/missing" className="text-seal">
          Who still needs a walk
        </Link>
        {" · "}
        <Link href="/moved" className="text-seal">
          Who moved away
        </Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="lanes-list">
        {items.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}/lane`} className="font-display text-2xl text-seal">
              {row.heading}
            </Link>
            <p className="text-bark">{row.stops === 1 ? "1 stop" : `${row.stops} stops`}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{lanesIndexHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
