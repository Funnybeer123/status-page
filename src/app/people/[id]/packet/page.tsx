import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { compilePersonFacts, packetLetterName, packetPhotoName } from "@/lib/personPacket";

export default async function PersonPacketPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      documents: { include: { document: true } },
      tags: { include: { asset: true } },
      citations: true,
    },
  });
  if (!person) notFound();
  if (hideMinorDetails(ctx.role, person)) notFound();
  const hideLiving = shouldHideLivingFacts(ctx.role, person);
  const letters = person.documents
    .map((item) => item.document)
    .filter((document) => document && !document.deletedAt && document.kind !== "story");
  const photos = person.tags
    .map((tag) => tag.asset)
    .filter((asset) => asset && !asset.deletedAt && asset.kind === "photo");
  const facts = hideLiving ? [] : person.citations.map((citation) => ({ claim: citation.claim, quality: citation.quality }));
  const preview = compilePersonFacts({
    person,
    letters,
    photos: photos.map((photo) => ({ title: photo.title, filename: photo.storagePath })),
    facts,
    hideLiving,
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Person packet</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="packet-heading">{person.displayName}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        One download of this person’s photographs, letters, and facts.{" "}
        <a href={`/api/people/${person.id}/packet`} className="text-seal" data-testid="packet-download">
          Download the packet
        </a>
      </p>
      <pre className="paper-card mt-8 whitespace-pre-wrap p-5 font-sans text-sm" data-testid="packet-facts">
        {preview}
      </pre>
      <ul className="mt-8 space-y-2" data-testid="packet-files">
        {letters.map((letter, index) => (
          <li key={letter.id}>
            <Link href={`/letters/${letter.id}`} className="text-seal">{packetLetterName(letter.title, index)}</Link>
          </li>
        ))}
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <Link href={`/archive/${photo.id}`} className="text-seal">{packetPhotoName(photo.title, photo.storagePath, index)}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
