import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EnvelopeForm } from "@/app/firsts/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { envelopeHeading, envelopeLine, hasEnvelope } from "@/lib/envelope";

export default async function EnvelopePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [letter, assets] = await Promise.all([
    prisma.document.findFirst({
      where: { id, familyId: ctx.family.id, deletedAt: null },
      include: { envelopeAsset: true },
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);
  if (!letter) notFound();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="envelope-heading">{envelopeHeading(letter.title)}</h1>
      <p className="mt-3 max-w-2xl text-bark" data-testid="envelope-line">
        {envelopeLine(letter.envelopeFrom, letter.envelopeTo, letter.writtenAt)}
      </p>
      <p className="mt-3 font-sans text-sm">
        <Link href={`/letters/${letter.id}`} className="text-seal">The letter</Link>
        {" · "}
        <Link href="/letters/envelopes" className="text-seal">All envelopes</Link>
      </p>
      <article className="paper-card mt-10 p-8" data-testid="envelope-card">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">To</p>
        <p className="mt-2 font-display text-3xl">{letter.envelopeTo || "Unknown addressee"}</p>
        <p className="mt-6 font-sans text-xs uppercase tracking-[0.2em] text-gold">From</p>
        <p className="mt-2 font-display text-2xl">{letter.envelopeFrom || "Unknown sender"}</p>
        <p className="mt-6 text-bark">{envelopeLine(letter.envelopeFrom, letter.envelopeTo, letter.writtenAt)}</p>
      </article>
      {letter.envelopeAsset ? (
        <figure className="paper-card mt-8 overflow-hidden p-4" data-testid="envelope-scan">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${letter.envelopeAsset.storagePath}`} alt="Envelope scan" className="w-full bg-cream" />
        </figure>
      ) : null}
      {!hasEnvelope(letter) ? <p className="mt-8 text-bark">This letter still needs an envelope.</p> : null}
      {canWrite(ctx.role) ? (
        <EnvelopeForm
          letterId={letter.id}
          from={letter.envelopeFrom}
          to={letter.envelopeTo}
          assetId={letter.envelopeAssetId}
          assets={assets}
        />
      ) : null}
    </AppShell>
  );
}
