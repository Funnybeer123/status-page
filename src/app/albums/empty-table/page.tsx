import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { albumPhotos } from "@/lib/albumZip";
import { emptyTableAlbumsHeading } from "@/lib/albumTable";

export default async function EmptyTableAlbumsPage() {
  const ctx = await requireFamily();
  const albums = await prisma.album.findMany({
    where: { familyId: ctx.family.id },
    include: { items: { include: { asset: true } } },
    orderBy: { title: "asc" },
  });
  const empty = albums.filter((album) => !albumPhotos(album.items).length);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-table-albums-heading">
        {emptyTableAlbumsHeading(empty.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="empty-table-albums">
        {empty.map((album) => (
          <li key={album.id}>
            <Link href={`/albums/${album.id}`} className="text-seal">{album.title}</Link>
          </li>
        ))}
        {!empty.length ? <li className="text-bark">{emptyTableAlbumsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
