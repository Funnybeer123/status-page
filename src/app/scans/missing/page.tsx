import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { householdHeading } from "@/lib/censusCompare";
import { householdsMissingScan, missingScanHeading } from "@/lib/scans";
import { ScanAttachForm } from "@/app/attach/ui";

export default async function MissingScansPage() {
  const ctx = await requireFamily();
  const [households, assets] = await Promise.all([
    prisma.censusHousehold.findMany({
      where: { familyId: ctx.family.id },
      orderBy: [{ year: "asc" }, { place: "asc" }],
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      orderBy: { title: "asc" },
    }),
  ]);
  const missing = householdsMissingScan(households);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/households" className="text-seal">Households</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-scans-heading">
        {missingScanHeading(missing.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">A census year without the page scan still attached.</p>
      {canWrite(ctx.role) ? (
        <ScanAttachForm
          households={households.map((row) => ({ id: row.id, label: householdHeading(row.place, row.year, row.street) }))}
          assets={assets.map((asset) => ({ id: asset.id, label: asset.title || "A scan" }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="missing-scans-list">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/households/${row.id}`} className="font-display text-2xl text-seal">
              {householdHeading(row.place, row.year, row.street)}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every household has its scan.</li> : null}
      </ul>
    </AppShell>
  );
}
