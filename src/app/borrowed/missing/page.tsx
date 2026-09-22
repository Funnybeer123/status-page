import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { uncreditedHeading } from "@/lib/borrowedFrom";

export default async function UncreditedPage() {
  const ctx = await requireFamily();
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "photo", borrowedFromAlbumId: null },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="uncredited-heading">
        {uncreditedHeading(photos.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="uncredited-list">
        {photos.map((photo) => (
          <li key={photo.id} className="paper-card p-4">
            <Link href={`/archive/${photo.id}`} className="font-display text-xl text-seal">
              {photo.title || "Untitled photograph"}
            </Link>
          </li>
        ))}
        {!photos.length ? <li className="text-bark">{uncreditedHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
