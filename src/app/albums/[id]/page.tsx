import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AlbumAddForm, AlbumSlideshow } from "@/app/albums/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { ShareLinkButton } from "@/app/share/ui";
import { hidePhotoFromAudience } from "@/lib/privacy";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [album, assets, documents] = await Promise.all([
    prisma.album.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { items: { include: { asset: { include: { tags: { include: { person: true } } } }, document: true, story: true } }, createdBy: true },
    }),
    prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.document.findMany({ where: { familyId: ctx.family.id, kind: { in: ["letter", "note"] }, deletedAt: null }, orderBy: { title: "asc" } }),
  ]);
  if (!album) notFound();
  const items = album.items.filter(
    (item) => !item.asset || !hidePhotoFromAudience(ctx.role, item.asset.tags.map((tag) => tag.person)),
  );
  const slides = items
    .filter((item) => item.asset && item.asset.mimeType.startsWith("image/"))
    .map((item) => ({
      src: `/api/media/${item.asset!.storagePath}`,
      title: item.asset!.title || "Untitled",
    }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Album</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="album-title">{album.title}</h1>
      {album.summary ? <p className="mt-3 max-w-2xl text-bark">{album.summary}</p> : null}
      <AlbumSlideshow slides={slides} />
      {canWrite(ctx.role) ? <ShareLinkButton kind="album" entityId={album.id} /> : null}
      {canWrite(ctx.role) ? (
        <AlbumAddForm
          albumId={album.id}
          assets={assets.map((asset) => ({ id: asset.id, title: asset.title }))}
          documents={documents.map((document) => ({ id: document.id, title: document.title }))}
        />
      ) : null}
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          if (item.asset) {
            return (
              <li key={item.id} className="paper-card overflow-hidden">
                <Link href={`/archive/${item.asset.id}`}>
                  {item.asset.mimeType.startsWith("audio/") ? (
                    <p className="p-5">Oral history · {item.asset.title}</p>
                  ) : item.asset.mimeType.startsWith("video/") ? (
                    <video src={`/api/media/${item.asset.storagePath}`} className="aspect-video w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/media/${item.asset.storagePath}`} alt={item.asset.title ?? ""} className="aspect-video w-full object-cover" />
                  )}
                  <p className="p-4 font-display text-xl">{item.asset.title}</p>
                </Link>
              </li>
            );
          }
          if (item.document) {
            return (
              <li key={item.id} className="paper-card p-5">
                <Link href={`/letters/${item.document.id}`} className="font-display text-2xl text-seal">{item.document.title}</Link>
              </li>
            );
          }
          if (item.story) {
            return (
              <li key={item.id} className="paper-card p-5">
                <Link href={`/stories/${item.story.id}`} className="font-display text-2xl text-seal">{item.story.title}</Link>
              </li>
            );
          }
          return null;
        })}
      </ul>
    </AppShell>
  );
}
