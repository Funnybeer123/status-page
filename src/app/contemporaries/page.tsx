import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { contemporariesHeading, lonelyPlacesHeading, overlappingResidents } from "@/lib/contemporaries";

export default async function ContemporariesPage() {
  const ctx = await requireFamily();
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    include: { residences: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  const rows = places.map((place) => {
    const residences = place.residences
      .filter((item) => !hideResidenceForViewer(ctx.role, item.person))
      .map((item) => ({
        id: item.id,
        personId: item.personId,
        personName: item.person.displayName,
        startedAt: item.startedAt,
        endedAt: item.endedAt,
      }));
    return { place, pairs: overlappingResidents(residences) };
  });
  const overlapping = rows.filter((row) => row.pairs.length);
  const lonely = rows.filter((row) => row.place.residences.length >= 2 && !row.pairs.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="family-contemporaries-heading">
        {overlapping.length === 1
          ? "1 place where people lived at the same time"
          : `${overlapping.length} places where people lived at the same time`}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="family-contemporaries-list">
        {overlapping.map((row) => (
          <li key={row.place.id} className="paper-card p-5">
            <Link href={`/places/${row.place.id}/together`} className="font-display text-2xl text-seal">
              {contemporariesHeading(row.place.name, row.pairs.length)}
            </Link>
          </li>
        ))}
        {!overlapping.length ? <li className="text-bark">Record overlapping years at a house.</li> : null}
      </ul>
      <h2 className="mt-10 font-display text-3xl" data-testid="lonely-places-heading">{lonelyPlacesHeading(lonely.length)}</h2>
      <ul className="mt-4 space-y-3">
        {lonely.map((row) => (
          <li key={row.place.id} className="paper-card p-5">
            <Link href={`/places/${row.place.id}/together`} className="text-seal">{row.place.name}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
