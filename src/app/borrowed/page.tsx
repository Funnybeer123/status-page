import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { borrowedFromLine, borrowedIndexHeading } from "@/lib/borrowedFrom";

export default async function BorrowedPage() {
  const ctx = await requireFamily();
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, borrowedFromAlbumId: { not: null } },
    include: { borrowedFromAlbum: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="borrowed-heading">
        {borrowedIndexHeading(photos.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Photographs that came from another relative’s album.{" "}
        <Link href="/borrowed/missing" className="text-seal">
          Still uncredited
        </Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="borrowed-list">
        {photos.map((photo) => (
          <li key={photo.id} className="paper-card p-5">
            <Link href={`/archive/${photo.id}`} className="font-display text-2xl text-seal">
              {photo.title || "Untitled photograph"}
            </Link>
            <p className="text-bark">{borrowedFromLine(photo.borrowedFromAlbum?.title)}</p>
          </li>
        ))}
        {!photos.length ? <li className="text-bark">{borrowedIndexHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
