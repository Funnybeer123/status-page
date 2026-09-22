import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { missingLaneHeading } from "@/lib/memoryLane";

export default async function MissingLanesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { residences: true },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter((person) => !person.residences.length && !hideResidenceForViewer(ctx.role, person));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-lanes-heading">
        {missingLaneHeading(missing.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="missing-lanes">
        {missing.map((person) => (
          <li key={person.id} className="paper-card p-4">
            <Link href={`/people/${person.id}`} className="font-display text-xl text-seal">
              {person.displayName}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingLaneHeading(0)}</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/lanes" className="text-seal">
          Memory lanes
        </Link>
      </p>
    </AppShell>
  );
}
