import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AlbumCreateForm } from "@/app/albums/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function AlbumsPage() {
  const ctx = await requireFamily();
  const albums = await prisma.album.findMany({
    where: { familyId: ctx.family.id },
    include: { items: true, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="albums-heading">Albums</h1>
      <p className="mt-3 max-w-2xl text-bark">Group photographs and letters the way the family still talks about them.</p>
      {canWrite(ctx.role) ? <AlbumCreateForm /> : null}
      <ul className="mt-10 space-y-3">
        {albums.map((album) => (
          <li key={album.id} className="paper-card p-5">
            <Link href={`/albums/${album.id}`} className="font-display text-2xl text-seal">{album.title}</Link>
            <p className="text-bark">{album.summary}</p>
            <p className="font-sans text-sm text-gold">{album.items.length} pieces · {album.createdBy.name}</p>
          </li>
        ))}
        {!albums.length ? <li className="text-bark">No albums yet.</li> : null}
      </ul>
    </AppShell>
  );
}
