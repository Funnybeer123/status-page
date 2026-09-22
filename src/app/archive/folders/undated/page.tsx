import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { filterAssetsForAudience } from "@/lib/privacy";
import { compileArchiveFolders, undatedFolderHeading } from "@/lib/archiveFolders";

export default async function UndatedFolderPage() {
  const ctx = await requireFamily();
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
  });
  const folder = compileArchiveFolders(filterAssetsForAudience(assets, ctx.role)).find((row) => row.decade === "undated");
  const items = folder?.items ?? [];
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="undated-folder-heading">
        {undatedFolderHeading(items.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="undated-folder">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="text-seal">{item.title}</Link>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{undatedFolderHeading(0)}</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/archive/folders" className="text-seal">Decade folders</Link>
      </p>
    </AppShell>
  );
}
