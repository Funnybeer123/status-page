import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { missingManifestHeading, voyagesMissingManifest } from "@/lib/scans";
import { ManifestAttachForm } from "@/app/attach/ui";

export default async function MissingManifestsPage() {
  const ctx = await requireFamily();
  const [voyages, assets] = await Promise.all([
    prisma.voyage.findMany({ where: { familyId: ctx.family.id }, orderBy: { departedOn: "asc" } }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      orderBy: { title: "asc" },
    }),
  ]);
  const missing = voyagesMissingManifest(voyages);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/voyages" className="text-seal">Voyages</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-manifests-heading">
        {missingManifestHeading(missing.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Passenger lists still waiting for the ship’s page.</p>
      {canWrite(ctx.role) ? (
        <ManifestAttachForm
          voyages={voyages.map((row) => ({ id: row.id, label: row.ship }))}
          assets={assets.map((asset) => ({ id: asset.id, label: asset.title || "A scan" }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="missing-manifests-list">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/voyages/${row.id}`} className="font-display text-2xl text-seal">{row.ship}</Link>
            <p className="text-bark">{row.departedFrom} → {row.arrivedAt}</p>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every voyage has its manifest.</li> : null}
      </ul>
    </AppShell>
  );
}
