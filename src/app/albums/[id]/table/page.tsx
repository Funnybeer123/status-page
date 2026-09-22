import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mediaRoot } from "@/lib/media";
import { hidePhotoFromAudience } from "@/lib/privacy";
import { watermarkPhoto } from "@/lib/watermark";
import { albumTableHeading, albumTableHint, albumTableMark, emptyAlbumTableHeading } from "@/lib/albumTable";

export default async function AlbumTablePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const album = await prisma.album.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { items: { include: { asset: { include: { tags: { include: { person: true } } } } } } },
  });
  if (!album) notFound();
  const photos = album.items
    .map((item) => item.asset)
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset && !asset.deletedAt && asset.kind === "photo"))
    .filter((asset) => !hidePhotoFromAudience(ctx.role, asset.tags.map((tag) => tag.person)));
  const mark = albumTableMark(ctx.family.name);
  const sheets = [];
  for (const photo of photos) {
    try {
      const bytes = await readFile(join(mediaRoot(), photo.storagePath));
      const marked = watermarkPhoto(bytes, photo.mimeType, mark);
      sheets.push({
        id: photo.id,
        title: photo.title || "Untitled",
        dataUrl: `data:${marked.mimeType};base64,${marked.bytes.toString("base64")}`,
      });
    } catch {
      sheets.push({ id: photo.id, title: photo.title || "Untitled", dataUrl: null });
    }
  }
  return (
    <AppShell>
      <article className="print:max-w-none">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Reunion table sheet</p>
        <h1 className="mt-2 font-display text-4xl" data-testid="album-table-heading">{albumTableHeading(album.title)}</h1>
        <p className="mt-3 max-w-2xl text-bark print:hidden">{albumTableHint()}</p>
        <p className="mt-2 font-sans text-sm text-gold" data-testid="album-table-mark">{mark}</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2" data-testid="album-table-sheet">
          {sheets.map((sheet) => (
            <figure key={sheet.id} className="paper-card overflow-hidden p-4">
              {sheet.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sheet.dataUrl} alt={sheet.title} className="w-full bg-cream" />
              ) : null}
              <figcaption className="mt-2 font-display text-xl">{sheet.title}</figcaption>
            </figure>
          ))}
          {!sheets.length ? <p className="text-bark">{emptyAlbumTableHeading()}</p> : null}
        </div>
        <p className="mt-8 font-sans text-sm print:hidden">
          <Link href={`/albums/${album.id}`} className="text-seal">Back to the album</Link>
          {" · "}
          <Link href="/albums/empty-table" className="text-seal">Albums without a table sheet</Link>
        </p>
      </article>
    </AppShell>
  );
}
