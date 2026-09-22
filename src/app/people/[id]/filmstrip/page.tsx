import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { filmstripHeading, isPhotoAsset, sortFilmstrip } from "@/lib/filmstrip";
import { hideMinorDetails, hidePhotoFromAudience } from "@/lib/privacy";

export default async function FilmstripPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { asset: { include: { tags: { include: { person: true } } } } } } },
  });
  if (!person || hideMinorDetails(ctx.role, person)) notFound();
  const photos = sortFilmstrip(
    person.tags
      .map((tag) => tag.asset)
      .filter((asset) => asset && isPhotoAsset(asset) && !hidePhotoFromAudience(ctx.role, asset.tags.map((item) => item.person))),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{person.displayName}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="filmstrip-heading">{filmstripHeading(person.displayName, photos.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Every photograph of this person, oldest first.</p>
      <div className="mt-10 flex gap-4 overflow-x-auto pb-4" data-testid="filmstrip-list">
        {photos.map((photo) => (
          <Link key={photo.id} href={`/archive/${photo.id}`} className="w-56 shrink-0 paper-card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/media/${photo.storagePath}`} alt={photo.title || person.displayName} className="aspect-[4/3] w-full object-cover" />
            <p className="p-3 font-display text-lg">{photo.title || "A photograph"}</p>
            <p className="px-3 pb-3 font-sans text-sm text-gold">{formatDate(photo.capturedAt, "Undated")}</p>
          </Link>
        ))}
        {!photos.length ? <p className="text-bark">No photographs tagged to this person yet.</p> : null}
      </div>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/people/${person.id}`} className="text-seal">The record</Link>
        {" · "}
        <Link href="/portraits" className="text-seal">Portrait wall</Link>
        {" · "}
        <Link href="/filmstrips/family" className="text-seal">Family filmstrip</Link>
      </p>
    </AppShell>
  );
}
