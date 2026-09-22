import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatYear } from "@/lib/dates";
import { hideResidenceForViewer } from "@/lib/privacy";
import { movedAwayHeading, movedAwayLine } from "@/lib/dayDigest";

export default async function MovedAwayPage() {
  const ctx = await requireFamily();
  const residences = await prisma.residence.findMany({
    where: { familyId: ctx.family.id, endedAt: { not: null } },
    include: { person: true, place: true },
    orderBy: { endedAt: "asc" },
  });
  const items = residences
    .filter((row) => !hideResidenceForViewer(ctx.role, row.person))
    .map((row) => ({
      id: row.id,
      line: movedAwayLine(row.person.displayName, row.place.name, formatYear(row.endedAt) || null),
      href: `/people/${row.personId}/lane`,
    }));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="moved-heading">
        {movedAwayHeading(items.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">People whose residence in a place has a closing date.</p>
      <ul className="mt-10 space-y-3" data-testid="moved-list">
        {items.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={row.href} className="font-display text-2xl text-seal">
              {row.line}
            </Link>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{movedAwayHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
