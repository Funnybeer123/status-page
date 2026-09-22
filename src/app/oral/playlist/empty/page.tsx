import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyPlaylistHeading, isOralHistory } from "@/lib/oralPlaylist";

export default async function EmptyPlaylistPage() {
  const ctx = await requireFamily();
  const recordings = await prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: null } });
  const empty = !recordings.some(isOralHistory);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-playlist-heading">
        {empty ? emptyPlaylistHeading() : "The oral-history playlist has recordings"}
      </h1>
    </AppShell>
  );
}
