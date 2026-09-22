import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { contemporariesHeading, overlappingResidents, peopleWhoLivedTogether, residenceYears } from "@/lib/contemporaries";

export default async function PlaceTogetherPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const place = await prisma.place.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { residences: { include: { person: true } } },
  });
  if (!place) notFound();
  const rows = place.residences
    .filter((item) => !hideResidenceForViewer(ctx.role, item.person))
    .map((item) => ({
      id: item.id,
      personId: item.personId,
      personName: item.person.displayName,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
    }));
  const pairs = overlappingResidents(rows);
  const people = peopleWhoLivedTogether(rows);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{place.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="contemporaries-heading">
        {contemporariesHeading(place.name, pairs.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Who lived here in the same years.</p>
      <ul className="mt-10 space-y-3" data-testid="contemporaries-list">
        {pairs.map((pair) => (
          <li key={`${pair.a.id}-${pair.b.id}`} className="paper-card p-5">
            <p className="font-display text-2xl">{pair.line}</p>
            <p className="text-bark">
              {residenceYears(pair.a.startedAt, pair.a.endedAt)} · {residenceYears(pair.b.startedAt, pair.b.endedAt)}
            </p>
          </li>
        ))}
        {!pairs.length ? <li className="text-bark">No overlapping years recorded here yet.</li> : null}
      </ul>
      <ul className="mt-8 space-y-2">
        {people.map((row) => (
          <li key={row.personId}>
            <Link href={`/people/${row.personId}`} className="text-seal">{row.personName}</Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/places/${place.id}`} className="text-seal">Back to the place</Link>
        {" · "}
        <Link href="/contemporaries" className="text-seal">Every overlapping place</Link>
      </p>
    </AppShell>
  );
}
