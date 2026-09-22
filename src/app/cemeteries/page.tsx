import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CemeteryForm } from "@/app/cemeteries/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function CemeteriesPage() {
  const ctx = await requireFamily();
  const cemeteries = await prisma.cemetery.findMany({
    where: { familyId: ctx.family.id },
    include: { plots: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="cemeteries-heading">Cemeteries</h1>
      <p className="mt-3 max-w-2xl text-bark">Burial places, plots, and a link to each memorial.</p>
      {canWrite(ctx.role) ? <CemeteryForm /> : null}
      <ul className="mt-10 space-y-3" data-testid="cemeteries-list">
        {cemeteries.map((cemetery) => (
          <li key={cemetery.id} className="paper-card p-5">
            <Link href={`/cemeteries/${cemetery.id}`} className="font-display text-2xl text-seal">{cemetery.name}</Link>
            <p className="text-bark">
              {[cemetery.locality, cemetery.region, cemetery.country].filter(Boolean).join(", ") || "Place not yet recorded"}
            </p>
            <p className="font-sans text-sm text-gold">{cemetery.plots.length} {cemetery.plots.length === 1 ? "plot" : "plots"}</p>
          </li>
        ))}
        {!cemeteries.length ? <li className="text-bark">No cemeteries yet.</li> : null}
      </ul>
    </AppShell>
  );
}
