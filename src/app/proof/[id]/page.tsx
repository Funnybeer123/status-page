import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileProofBoard, proofBoardHeading } from "@/lib/proofBoard";
import { shouldHideLivingFacts } from "@/lib/privacy";

export default async function ProofBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const citation = await prisma.citation.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      person: true,
      document: { include: { asset: true } },
      asset: true,
    },
  });
  if (!citation || shouldHideLivingFacts(ctx.role, citation.person)) notFound();
  const others = await prisma.citation.findMany({
    where: { familyId: ctx.family.id, claim: citation.claim },
    include: { person: true, document: { include: { asset: true } }, asset: true },
  });
  const board = compileProofBoard(
    citation,
    others.filter((item) => !shouldHideLivingFacts(ctx.role, item.person)),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Proof board</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="proof-heading">{proofBoardHeading(citation.claim)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Every citation and image that supports this fact.</p>
      <ul className="mt-8 space-y-3" data-testid="proof-citations">
        {board.citations.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-display text-xl">{item.claim}</p>
            {item.document ? (
              <Link href={`/letters/${item.document.id}`} className="mt-2 inline-block text-seal">{item.document.title}</Link>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-8 grid gap-4 sm:grid-cols-2" data-testid="proof-images">
        {board.images.map((image) => (
          <Link key={image.id} href={image.href} className="paper-card overflow-hidden">
            {image.storagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${image.storagePath}`} alt={image.title} className="aspect-video w-full object-cover" />
            ) : null}
            <p className="p-4 font-display text-xl">{image.title}</p>
          </Link>
        ))}
        {!board.images.length ? <p className="text-bark">No supporting image yet.</p> : null}
      </div>
      <p className="mt-8 font-sans text-sm">
        <Link href="/sources" className="text-seal">Sources</Link>
        {" · "}
        <Link href="/proof" className="text-seal">All proof boards</Link>
      </p>
    </AppShell>
  );
}
