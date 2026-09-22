import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compareHeading, compareSideLabel, hasEdits, latestRevision } from "@/lib/transcriptCompare";

export default async function LetterComparePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { revisions: { include: { editedBy: { select: { name: true } } }, orderBy: { editedAt: "desc" } } },
  });
  if (!letter || !hasEdits(letter.revisions)) notFound();
  const earlier = latestRevision(letter.revisions);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="transcript-compare-heading">
        {compareHeading()}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        {letter.title}.{" "}
        <Link href={`/letters/${letter.id}`} className="text-seal">Back to the letter</Link>.
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2" data-testid="transcript-compare">
        <section className="paper-card p-5">
          <h2 className="font-display text-2xl">{compareSideLabel("earlier")}</h2>
          <p className="mt-4 whitespace-pre-wrap text-bark">{earlier?.transcript}</p>
        </section>
        <section className="paper-card p-5">
          <h2 className="font-display text-2xl">{compareSideLabel("current")}</h2>
          <p className="mt-4 whitespace-pre-wrap text-bark">{letter.transcript}</p>
        </section>
      </div>
    </AppShell>
  );
}
