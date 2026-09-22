import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingCamerasHeading } from "@/lib/photographer";

export default async function MissingCamerasPage() {
  const ctx = await requireFamily();
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "photo", takenById: null },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-cameras-heading">
        {missingCamerasHeading(photos.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-cameras-list">
        {photos.map((photo) => (
          <li key={photo.id} className="paper-card p-5">
            <Link href="/cameras" className="font-display text-2xl text-seal">{photo.title || "Untitled photograph"}</Link>
          </li>
        ))}
        {!photos.length ? <li className="text-bark">{missingCamerasHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
