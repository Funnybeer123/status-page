import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FileBoxForm, FileManyForm } from "@/app/box/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { boxHeading, boxItemLine } from "@/lib/box";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function BoxPage() {
  const ctx = await requireFamily();
  const [assets, people] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, tags: { none: {} } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="box-heading">
        {boxHeading(assets.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Uploads that are not filed onto a person yet.         File each one so it shows up on their page, or file several onto one person at once.
      </p>
      {canWrite(ctx.role) ? (
        <FileManyForm
          assets={assets.map((asset) => ({ id: asset.id, title: asset.title }))}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="box-list">
        {assets.map((asset) => (
          <li key={asset.id} className="paper-card p-5">
            <Link href={`/archive/${asset.id}`} className="font-display text-2xl text-seal">
              {boxItemLine(asset.title)}
            </Link>
            <p className="font-sans text-sm text-gold">{formatDate(asset.capturedAt || asset.createdAt, "")}</p>
            {canWrite(ctx.role) ? (
              <FileBoxForm
                assetId={asset.id}
                people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
              />
            ) : null}
          </li>
        ))}
        {!assets.length ? <li className="text-bark">Nothing left in the unsorted box.</li> : null}
      </ul>
    </AppShell>
  );
}
