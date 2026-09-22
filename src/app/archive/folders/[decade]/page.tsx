import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { filterAssetsForAudience } from "@/lib/privacy";
import { compileArchiveFolders, decadeFolderHeading } from "@/lib/archiveFolders";

export default async function DecadeFolderPage({ params }: { params: Promise<{ decade: string }> }) {
  const ctx = await requireFamily();
  const { decade } = await params;
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
  });
  const folders = compileArchiveFolders(filterAssetsForAudience(assets, ctx.role));
  const key = decade === "undated" ? "undated" : Number(decade);
  const folder = folders.find((row) => row.decade === key);
  const heading = folder?.heading || decadeFolderHeading(key === "undated" ? "undated" : Number(decade) || "undated");
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="decade-folder-heading">{heading}</h1>
      <ul className="mt-8 space-y-3" data-testid="decade-folder">
        {(folder?.items ?? []).map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="text-seal">{item.title}</Link>
          </li>
        ))}
        {!folder?.items.length ? <li className="text-bark">Nothing in this decade folder yet.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/archive/folders" className="text-seal">All decade folders</Link>
      </p>
    </AppShell>
  );
}
