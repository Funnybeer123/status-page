import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CommentThread } from "@/components/CommentThread";
import { PhotoLocateForm, PhotoTagForm } from "@/app/archive/tag";
import { PhotoPlaceForm } from "@/app/archive/place";
import { TranscribeForm } from "@/app/oral/ui";
import { FilmMomentForm } from "@/app/films/ui";
import { filmMomentLine, sortFilmMoments } from "@/lib/filmMoments";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";
import { hidePhotoFromAudience } from "@/lib/privacy";
import { placedOnPhoto } from "@/lib/whoWhere";
import Link from "next/link";
import { TrashRestore } from "@/app/trash/ui";

export default async function ArchiveItemPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [asset, people, places] = await Promise.all([
    prisma.asset.findFirst({
      where: { id, familyId: ctx.family.id, deletedAt: null },
      include: { tags: { include: { person: true } }, comments: { include: { author: true } }, place: true, document: true, filmMoments: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.place.findMany({ where: { familyId: ctx.family.id }, orderBy: { name: "asc" } }),
  ]);
  if (!asset) notFound();
  if (hidePhotoFromAudience(ctx.role, asset.tags.map((tag) => tag.person))) notFound();
  const marks = placedOnPhoto(
    asset.tags.map((tag) => ({
      id: tag.id,
      personId: tag.personId,
      name: tag.person.displayName,
      x: tag.x,
      y: tag.y,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{asset.kind}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="asset-title">{asset.title || "Untitled"}</h1>
      <p className="mt-2 text-bark">
        {formatDate(asset.capturedAt, "Undated")}
        {asset.tags.length ? ` · ${asset.tags.map((tag) => tag.person.displayName).join(", ")}` : ""}
        {asset.place ? ` · Taken at ${asset.place.name}` : ""}
      </p>
      <div className="paper-card mt-8 overflow-hidden p-4">
        {asset.mimeType.startsWith("video/") ? (
          <video controls src={`/api/media/${asset.storagePath}`} className="w-full" />
        ) : asset.mimeType.startsWith("audio/") || asset.kind === "audio" ? (
          <audio controls src={`/api/media/${asset.storagePath}`} className="w-full" data-testid="oral-audio" />
        ) : (
          <div className="relative" data-testid="who-where">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/media/${asset.storagePath}`} alt={asset.title ?? ""} className="w-full" />
            {marks.map((mark) => (
              <span
                key={mark.id}
                className="absolute -translate-x-1/2 -translate-y-full rounded-full bg-seal px-2 py-1 font-sans text-xs text-cream"
                style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                data-testid="who-where-mark"
              >
                {mark.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="mt-4 font-sans text-sm">
        <Link href="/archive" className="text-seal">Back to the archive</Link>
      </p>
      {canWrite(ctx.role) ? <TrashRestore type="photo" id={asset.id} /> : null}
      {canWrite(ctx.role) ? (
        <PhotoTagForm
          assetId={asset.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          taggedIds={asset.tags.map((tag) => tag.personId)}
        />
      ) : null}
      {canWrite(ctx.role) && asset.kind === "photo" ? (
        <PhotoLocateForm
          assetId={asset.id}
          tags={asset.tags.map((tag) => ({
            personId: tag.personId,
            name: tag.person.displayName,
            x: tag.x,
            y: tag.y,
          }))}
        />
      ) : null}
      {canWrite(ctx.role) && asset.kind === "photo" ? (
        <PhotoPlaceForm assetId={asset.id} places={places.map((place) => ({ id: place.id, name: place.name }))} />
      ) : null}
      {asset.document && (asset.kind === "audio" || asset.kind === "video" || asset.mimeType.startsWith("audio/")) ? (
        <p className="mt-6 text-bark" data-testid="oral-transcript">{asset.document.transcript}</p>
      ) : null}
      {asset.kind === "video" || asset.mimeType.startsWith("video/") ? (
        <section className="mt-8" data-testid="film-moments">
          <h2 className="font-display text-2xl">Moments in the film</h2>
          <ul className="mt-4 space-y-2">
            {sortFilmMoments(asset.filmMoments).map((moment) => (
              <li key={moment.id} className="paper-card p-4">{filmMomentLine(moment)}</li>
            ))}
            {!asset.filmMoments.length ? <li className="text-bark">No moments marked yet.</li> : null}
          </ul>
          {canWrite(ctx.role) ? <FilmMomentForm assetId={asset.id} /> : null}
        </section>
      ) : null}
      {canWrite(ctx.role) && !asset.document && (asset.kind === "audio" || asset.kind === "video" || asset.mimeType.startsWith("audio/")) ? (
        <TranscribeForm
          assetId={asset.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <CommentThread
        comments={asset.comments}
        assetId={asset.id}
        canWrite={canWrite(ctx.role)}
      />
    </AppShell>
  );
}
