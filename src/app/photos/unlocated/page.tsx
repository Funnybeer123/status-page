import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { unlocatedTags } from "@/lib/whoWhere";

export default async function UnlocatedPhotosPage() {
  const ctx = await requireFamily();
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "photo", tags: { some: {} } },
    include: { tags: { include: { person: true } } },
    orderBy: { title: "asc" },
  });
  const rows = photos
    .map((photo) => ({
      photo,
      missing: unlocatedTags(
        photo.tags.map((tag) => ({
          id: tag.id,
          personId: tag.personId,
          name: tag.person.displayName,
          x: tag.x,
          y: tag.y,
        })),
      ),
    }))
    .filter((row) => row.missing.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="unlocated-heading">Tagged, but not placed</h1>
      <p className="mt-3 max-w-2xl text-bark">People named on a photograph who still need a mark for where they stand.</p>
      <ul className="mt-10 space-y-3" data-testid="unlocated-list">
        {rows.map((row) => (
          <li key={row.photo.id} className="paper-card p-5">
            <Link href={`/archive/${row.photo.id}`} className="font-display text-2xl text-seal">{row.photo.title || "A photograph"}</Link>
            <p className="text-bark">{row.missing.map((tag) => tag.name).join(", ")}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">Everyone tagged has a place on the picture.</li> : null}
      </ul>
    </AppShell>
  );
}
