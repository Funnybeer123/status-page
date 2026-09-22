import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SitterForm } from "@/app/register/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { hidePhotoFromAudience } from "@/lib/privacy";
import { compileSitters, sitterLine, sittersHeading } from "@/lib/portraitSitter";

export default async function SittersPage() {
  const ctx = await requireFamily();
  const [photos, people, allPhotos] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, sitterId: { not: null } },
      include: { sitter: true, tags: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
      orderBy: { title: "asc" },
    }),
  ]);
  const visible = photos.filter(
    (photo) => photo.sitter && !hidePhotoFromAudience(ctx.role, photo.tags.map((tag) => tag.person)),
  );
  const rows = compileSitters(
    visible.map((photo) => ({
      id: photo.id,
      title: photo.title || "Untitled portrait",
      sitter: photo.sitter!.displayName,
      sitterId: photo.sitterId,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="sitters-heading">
        {sittersHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who sat for a portrait, separate from the people tagged in the photograph.{" "}
        <Link href="/portraits" className="text-seal">Portrait wall</Link>
        {" · "}
        <Link href="/sitters/missing" className="text-seal">Portraits without a sitter</Link>
      </p>
      {canWrite(ctx.role) ? (
        <SitterForm
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          photos={allPhotos.map((photo) => ({ id: photo.id, title: photo.title || "Untitled" }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="sitters-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">
              <Link href={`/people/${row.sitterId}`} className="text-seal">{sitterLine(row.title, row.sitter)}</Link>
            </p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{sittersHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
