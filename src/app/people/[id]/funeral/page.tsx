import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { funeralDates, funeralHeading, funeralLife } from "@/lib/funeral";
import { portraitAssetId } from "@/lib/portraits";
import { isLiving } from "@/lib/privacy";

export default async function FuneralProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      documents: { include: { document: true } },
      tags: { include: { asset: true } },
    },
  });
  if (!person || isLiving(person)) notFound();
  const letter = person.documents
    .map((row) => row.document)
    .find((doc) => doc.kind === "letter" && doc.deletedAt == null);
  const portraitId = portraitAssetId(person, person.tags.map((tag) => ({ personId: tag.personId, assetId: tag.assetId })));
  const portrait = portraitId ? person.tags.find((tag) => tag.assetId === portraitId)?.asset : null;
  return (
    <AppShell>
      <article className="mx-auto max-w-2xl print:max-w-none" data-testid="funeral-program">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Funeral program</p>
        <h1 className="mt-2 font-display text-5xl" data-testid="funeral-heading">{funeralHeading(person.displayName)}</h1>
        <p className="mt-3 text-xl text-bark" data-testid="funeral-dates">{funeralDates(person.birthDate, person.deathDate)}</p>
        {portrait ? (
          <div className="paper-card mt-8 overflow-hidden" data-testid="funeral-portrait">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/media/${portrait.storagePath}`} alt={portrait.title || person.displayName} className="mx-auto aspect-[3/4] w-full max-w-sm object-cover" />
          </div>
        ) : null}
        <p className="mt-8 text-lg leading-relaxed text-bark" data-testid="funeral-life">
          {funeralLife(person.notes, letter?.transcript)}
        </p>
        <p className="mt-10 font-sans text-sm print:hidden">
          <Link href={`/people/${person.id}/memorial`} className="text-seal">Memorial page</Link>
          {" · "}
          <Link href={`/people/${person.id}`} className="text-seal">The record</Link>
          {" · "}
          <Link href="/funerals" className="text-seal">All funeral programs</Link>
        </p>
      </article>
    </AppShell>
  );
}
