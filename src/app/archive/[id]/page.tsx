import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CommentThread } from "@/components/CommentThread";
import { PhotoTagForm } from "@/app/archive/tag";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";
import Link from "next/link";

export default async function ArchiveItemPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [asset, people] = await Promise.all([
    prisma.asset.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { tags: { include: { person: true } }, comments: { include: { author: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
  ]);
  if (!asset) notFound();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{asset.kind}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="asset-title">{asset.title || "Untitled"}</h1>
      <p className="mt-2 text-bark">
        {formatDate(asset.capturedAt, "Undated")}
        {asset.tags.length ? ` · ${asset.tags.map((tag) => tag.person.displayName).join(", ")}` : ""}
      </p>
      <div className="paper-card mt-8 overflow-hidden p-4">
        {asset.mimeType.startsWith("video/") ? (
          <video controls src={`/api/media/${asset.storagePath}`} className="w-full" />
        ) : asset.mimeType.startsWith("audio/") || asset.kind === "audio" ? (
          <audio controls src={`/api/media/${asset.storagePath}`} className="w-full" data-testid="oral-audio" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/media/${asset.storagePath}`} alt={asset.title ?? ""} className="w-full" />
        )}
      </div>
      <p className="mt-4 font-sans text-sm">
        <Link href="/archive" className="text-seal">Back to the archive</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PhotoTagForm
          assetId={asset.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          taggedIds={asset.tags.map((tag) => tag.personId)}
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
