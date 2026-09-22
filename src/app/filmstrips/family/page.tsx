import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { familyFilmstripHeading, isPhotoAsset, sortFilmstrip } from "@/lib/filmstrip";
import { hidePhotoFromAudience } from "@/lib/privacy";

export default async function FamilyFilmstripPage() {
  const ctx = await requireFamily();
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
  });
  const photos = sortFilmstrip(
    assets.filter((asset) => isPhotoAsset(asset) && !hidePhotoFromAudience(ctx.role, asset.tags.map((tag) => tag.person))),
  );
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="family-filmstrip-heading">{familyFilmstripHeading(photos.length)}</h1>
      <div className="mt-10 flex gap-4 overflow-x-auto pb-4" data-testid="family-filmstrip">
        {photos.map((photo) => (
          <Link key={photo.id} href={`/archive/${photo.id}`} className="w-56 shrink-0 paper-card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/media/${photo.storagePath}`} alt={photo.title || ""} className="aspect-[4/3] w-full object-cover" />
            <p className="p-3 font-display text-lg">{photo.title || "A photograph"}</p>
            <p className="px-3 pb-3 font-sans text-sm text-gold">{formatDate(photo.capturedAt, "Undated")}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
