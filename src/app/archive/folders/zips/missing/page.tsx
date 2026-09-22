import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { albumPhotos } from "@/lib/albumZip";
import { compileArchiveFolders } from "@/lib/archiveFolders";
import { missingDecadeZipHeading } from "@/lib/decadeZip";
import { filterAssetsForAudience, hidePhotoFromAudience } from "@/lib/privacy";

export default async function MissingDecadeZipsPage() {
  const ctx = await requireFamily();
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
  });
  const folders = compileArchiveFolders(filterAssetsForAudience(assets, ctx.role)).filter((folder) => {
    const photos = albumPhotos(
      folder.items.map((item) => ({ asset: assets.find((asset) => asset.id === item.id) })),
    ).filter((photo) => photo && !hidePhotoFromAudience(ctx.role, photo.tags?.map((tag) => tag.person) || []));
    return photos.length === 0;
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-decade-zip-heading">
        {missingDecadeZipHeading(folders.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-decade-zip-list">
        {folders.map((folder) => (
          <li key={String(folder.decade)} className="paper-card p-5">
            <Link href={`/archive/folders/${folder.decade}`} className="font-display text-2xl text-seal">
              {folder.heading}
            </Link>
          </li>
        ))}
        {!folders.length ? <li className="text-bark">{missingDecadeZipHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
