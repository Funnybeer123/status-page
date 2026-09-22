import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function UnplacedPhotosPage() {
  const ctx = await requireFamily();
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "photo", placeId: null },
    include: { tags: { include: { person: true } } },
    orderBy: { capturedAt: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="unplaced-heading">Photographs without a place</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Mark where the camera was from the archive page.{" "}
        <Link href="/map/photos" className="text-seal">Photo map</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="unplaced-list">
        {photos.map((photo) => (
          <li key={photo.id} className="paper-card p-5">
            <Link href={`/archive/${photo.id}`} className="font-display text-2xl text-seal">{photo.title || "A photograph"}</Link>
            <p className="font-sans text-sm text-gold">
              {formatDate(photo.capturedAt, "Undated")}
              {photo.tags.length ? ` · ${photo.tags.map((tag) => tag.person.displayName).join(", ")}` : ""}
            </p>
          </li>
        ))}
        {!photos.length ? <li className="text-bark">Every photograph has a place.</li> : null}
      </ul>
    </AppShell>
  );
}
