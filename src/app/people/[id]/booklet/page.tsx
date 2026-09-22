import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { bookletHeading, compilePacketBooklet } from "@/lib/packetBooklet";

export default async function PacketBookletPage({ params }: { params: Promise<{ id: string }> }) {
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
  if (!person || hideMinorDetails(ctx.role, person)) notFound();
  const hideLiving = shouldHideLivingFacts(ctx.role, person);
  const letters = hideLiving
    ? []
    : person.documents
        .map((item) => item.document)
        .filter((document) => document && !document.deletedAt && (document.kind === "letter" || document.kind === "note"));
  const photos = person.tags
    .map((tag) => tag.asset)
    .filter((asset) => asset && !asset.deletedAt && asset.kind === "photo");
  const facts = hideLiving
    ? []
    : person.citations.map((citation) => ({ claim: citation.claim, quality: citation.quality }));
  const chapters = compilePacketBooklet({
    person,
    letters,
    photos: photos.map((photo) => ({ title: photo.title, filename: photo.storagePath })),
    facts,
    hideLiving,
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Printable booklet</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="booklet-heading">{bookletHeading(person.displayName)}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        A printable PDF of this person’s packet.{" "}
        <a href={`/api/people/${person.id}/booklet`} className="text-seal" data-testid="booklet-download">
          Download the booklet
        </a>
        {" · "}
        <Link href={`/people/${person.id}/packet`} className="text-seal">The packet ZIP</Link>
      </p>
      <ol className="mt-10 space-y-6" data-testid="booklet-chapters">
        {chapters.map((chapter) => (
          <li key={chapter.title} className="paper-card p-5">
            <h2 className="font-display text-2xl">{chapter.title}</h2>
            {chapter.subtitle ? <p className="mt-2 text-bark">{chapter.subtitle}</p> : null}
            {chapter.sections.map((section) => (
              <div key={section.heading} className="mt-4">
                <h3 className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{section.heading}</h3>
                {section.body ? <p className="mt-2 whitespace-pre-wrap text-bark">{section.body}</p> : null}
              </div>
            ))}
          </li>
        ))}
      </ol>
    </AppShell>
  );
}
