import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ComparePicker } from "@/app/card/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { formatDate } from "@/lib/dates";
import { mapBounds, projectPoint } from "@/lib/geocode";
import { hideResidenceForViewer } from "@/lib/privacy";
import { placeLabel } from "@/lib/places";
import { compareResidencePoints, residenceCompareHeading, sortResidences } from "@/lib/residenceMap";

export default async function ResidenceComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    include: { residences: { include: { place: true } } },
    orderBy: { displayName: "asc" },
  });
  const a = people.find((person) => person.id === params.a);
  const b = people.find((person) => person.id === params.b);
  const rows = [a, b].flatMap((person) => {
    if (!person || hideResidenceForViewer(ctx.role, person)) return [];
    return sortResidences(person.residences).map((row) => ({
      personId: person.id,
      personName: person.displayName,
      placeName: placeLabel(row.place),
      when: formatDate(row.startedAt, "Undated"),
      latitude: row.place.latitude,
      longitude: row.place.longitude,
      gps: row.place.gps,
    }));
  });
  const mapped = compareResidencePoints(rows);
  const bounds = mapBounds(mapped);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="residence-compare-heading">
        {a && b ? residenceCompareHeading(a.displayName, b.displayName) : "Compare two residences"}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Two people’s homes on one map.{" "}
        <Link href="/map" className="text-seal">The family map</Link>.
      </p>
      <ComparePicker
        people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        a={params.a}
        b={params.b}
      />
      {bounds && mapped.length ? (
        <svg viewBox="0 0 640 360" className="mt-8 w-full rounded-2xl bg-paper" data-testid="residence-compare-map">
          {mapped.map((point) => {
            const xy = projectPoint(point, bounds, 640, 360);
            return (
              <g key={`${point.personId}-${point.placeName}`}>
                <circle cx={xy.x} cy={xy.y} r="7" className={point.personId === a?.id ? "fill-seal" : "fill-gold"} />
                <text x={xy.x + 10} y={xy.y + 4} className="fill-ink text-[11px]">{point.personName} · {point.placeName}</text>
              </g>
            );
          })}
        </svg>
      ) : null}
      <ul className="mt-8 space-y-3" data-testid="residence-compare-list">
        {rows.map((row, index) => (
          <li key={`${row.personId}-${row.placeName}-${index}`} className="paper-card p-4">
            <p className="font-display text-xl">{row.personName}</p>
            <p className="text-bark">{row.placeName} · {row.when}</p>
          </li>
        ))}
        {a && b && !rows.length ? <li className="text-bark">Neither person has a mapped residence yet.</li> : null}
      </ul>
    </AppShell>
  );
}
