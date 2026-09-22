import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { filterAssetsForAudience } from "@/lib/privacy";
import { archiveFoldersHeading, compileArchiveFolders } from "@/lib/archiveFolders";

export default async function ArchiveFoldersPage() {
  const ctx = await requireFamily();
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
    orderBy: { capturedAt: "asc" },
  });
  const folders = compileArchiveFolders(filterAssetsForAudience(assets, ctx.role));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="archive-folders-heading">
        {archiveFoldersHeading(folders.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Archive items grouped by ten-year spans.{" "}
        <Link href="/decades" className="text-seal">By decade</Link>
        {" · "}
        <Link href="/archive/folders/undated" className="text-seal">Items still without a date</Link>
      </p>
      <div className="mt-10 space-y-8" data-testid="archive-folders">
        {folders.map((folder) => (
          <section key={String(folder.decade)} className="paper-card p-5">
            <h2 className="font-display text-2xl">
              <Link href={`/archive/folders/${folder.decade}`} className="text-seal">{folder.heading}</Link>
            </h2>
            <ul className="mt-3 space-y-2">
              {folder.items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-seal">{item.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!folders.length ? <p className="text-bark">{archiveFoldersHeading(0)}</p> : null}
      </div>
    </AppShell>
  );
}
