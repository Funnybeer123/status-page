import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RestoreForm } from "@/app/restores/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { restoreLine, restorePairHeading } from "@/lib/restore";

export default async function RestoresPage() {
  const ctx = await requireFamily();
  const [restores, assets] = await Promise.all([
    prisma.photoRestore.findMany({
      where: { familyId: ctx.family.id },
      include: { original: true, cleaned: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
      orderBy: { title: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="restores-heading">
        {restorePairHeading(restores.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">The original scan beside the cleaned copy of one photograph.</p>
      {canWrite(ctx.role) ? (
        <RestoreForm assets={assets.map((asset) => ({ id: asset.id, title: asset.title }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="restores-list">
        {restores.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/restores/${row.id}`} className="font-display text-2xl text-seal">
              {restoreLine(row.title)}
            </Link>
          </li>
        ))}
        {!restores.length ? <li className="text-bark">No restoration pairs yet.</li> : null}
      </ul>
    </AppShell>
  );
}
