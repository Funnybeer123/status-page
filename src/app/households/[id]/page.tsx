import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { householdHeading, memberLine } from "@/lib/censusCompare";
import { canWrite } from "@/lib/roles";
import { scanHeading, scanLine } from "@/lib/scans";
import { ScanAttachForm } from "@/app/attach/ui";

export default async function HouseholdPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [household, assets] = await Promise.all([
    prisma.censusHousehold.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { people: { include: { person: true } }, scan: true },
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      orderBy: { title: "asc" },
    }),
  ]);
  if (!household) notFound();
  const siblings = await prisma.censusHousehold.findMany({
    where: { familyId: ctx.family.id, groupKey: household.groupKey, id: { not: household.id } },
    orderBy: { year: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/households" className="text-seal">Households</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="household-heading">
        {householdHeading(household.place, household.year, household.street)}
      </h1>
      {household.notes ? <p className="mt-3 text-bark">{household.notes}</p> : null}
      {household.scan ? (
        <figure className="paper-card mt-8 overflow-hidden" data-testid="household-scan">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${household.scan.storagePath}`} alt={scanLine(household.scan.title)} className="aspect-video w-full object-cover" />
          <figcaption className="p-4 font-sans text-sm text-gold">
            {scanHeading("census", `${household.place}, ${household.year}`)}
          </figcaption>
        </figure>
      ) : canWrite(ctx.role) ? (
        <ScanAttachForm
          households={[{ id: household.id, label: householdHeading(household.place, household.year, household.street) }]}
          assets={assets.map((asset) => ({ id: asset.id, label: asset.title || "A scan" }))}
        />
      ) : null}
      {siblings.length ? (
        <p className="mt-4 font-sans text-sm">
          <Link href={`/census/compare?group=${encodeURIComponent(household.groupKey)}`} className="text-seal">
            Compare with another year
          </Link>
        </p>
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="household-people">
        {household.people.map((row) => (
          <li key={row.personId} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.person.displayName}</Link>
            <p className="text-bark">{memberLine({
              personId: row.personId,
              name: row.person.displayName,
              role: row.role,
              age: row.age,
              occupation: row.occupation,
            })}</p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
