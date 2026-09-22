import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { albumPhotos } from "@/lib/albumZip";
import { compileArchiveFolders } from "@/lib/archiveFolders";
import { decadeZipHeading, decadeZipsReadyHeading } from "@/lib/decadeZip";
import { filterAssetsForAudience, hidePhotoFromAudience } from "@/lib/privacy";

export default async function DecadeZipsPage() {
  const ctx = await requireFamily();
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
  });
  const folders = compileArchiveFolders(filterAssetsForAudience(assets, ctx.role)).filter((folder) => {
    const photos = albumPhotos(
      folder.items.map((item) => ({ asset: assets.find((asset) => asset.id === item.id) })),
    ).filter((photo) => photo && !hidePhotoFromAudience(ctx.role, photo.tags?.map((tag) => tag.person) || []));
    return photos.length > 0;
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="decade-zips-heading">
        {decadeZipsReadyHeading(folders.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/archive/folders" className="text-seal">Decade folders</Link>
        {" · "}
        <Link href="/archive/folders/zips/missing" className="text-seal">Folders still without photographs</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="decade-zips-list">
        {folders.map((folder) => (
          <li key={String(folder.decade)} className="paper-card p-5">
            <Link href={`/archive/folders/${folder.decade}`} className="font-display text-2xl text-seal">
              {decadeZipHeading(folder.decade)}
            </Link>
          </li>
        ))}
        {!folders.length ? <li className="text-bark">{decadeZipsReadyHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
