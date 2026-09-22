import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { cleanedCopyLabel, originalScanLabel, restoreHeading } from "@/lib/restore";

export default async function RestorePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const restore = await prisma.photoRestore.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { original: true, cleaned: true },
  });
  if (!restore) notFound();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="restore-heading">
        {restoreHeading(restore.title)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        {restore.notes || "The original scan and the cleaned copy, side by side."}{" "}
        <Link href="/restores" className="text-seal">All restoration pairs</Link>.
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2" data-testid="restore-pair">
        <figure className="paper-card overflow-hidden p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${restore.original.storagePath}`} alt={originalScanLabel()} className="w-full bg-cream" />
          <figcaption className="mt-2 font-sans text-sm text-gold">{originalScanLabel()}</figcaption>
        </figure>
        <figure className="paper-card overflow-hidden p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${restore.cleaned.storagePath}`} alt={cleanedCopyLabel()} className="w-full bg-cream" />
          <figcaption className="mt-2 font-sans text-sm text-gold">{cleanedCopyLabel()}</figcaption>
        </figure>
      </div>
    </AppShell>
  );
}
