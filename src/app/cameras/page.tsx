import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { CameraForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { hidePhotoFromAudience } from "@/lib/privacy";
import { camerasHeading, compileCameras, photographerLine } from "@/lib/photographer";

export default async function CamerasPage() {
  const ctx = await requireFamily();
  const [photos, people, allPhotos] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, takenById: { not: null } },
      include: { takenBy: true, tags: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
      orderBy: { title: "asc" },
    }),
  ]);
  const visible = photos.filter(
    (photo) => photo.takenBy && !hidePhotoFromAudience(ctx.role, photo.tags.map((tag) => tag.person)),
  );
  const rows = compileCameras(
    visible.map((photo) => ({
      id: photo.id,
      title: photo.title || "Untitled photograph",
      photographer: photo.takenBy!.displayName,
      photographerId: photo.takenById,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="cameras-heading">
        {camerasHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who held the camera, separate from who is in the photograph.{" "}
        <Link href="/sitters" className="text-seal">Portrait sitters</Link>
        {" · "}
        <Link href="/cameras/missing" className="text-seal">Photographs without a camera credit</Link>
      </p>
      {canWrite(ctx.role) ? (
        <CameraForm
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          photos={allPhotos.map((photo) => ({ id: photo.id, title: photo.title || "Untitled" }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="cameras-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">{photographerLine(row.title, row.photographer)}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{camerasHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={camerasHeading(rows.length)} path="/cameras" />
    </AppShell>
  );
}
