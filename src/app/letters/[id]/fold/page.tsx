import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { FoldForm } from "@/app/story-circle/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { foldDiagramHeading, foldLine, foldPanelCount, foldSteps } from "@/lib/letterFold";

export default async function LetterFoldPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const letter = await prisma.document.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!letter) notFound();
  const steps = foldSteps(letter.foldPattern);
  const panels = foldPanelCount(letter.foldPattern);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{letter.title}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="fold-diagram-heading">
        {foldDiagramHeading(letter.title)}
      </h1>
      <p className="mt-3 text-bark">
        How the physical page was tucked.{" "}
        <Link href={`/letters/${letter.id}`} className="text-seal">Open the letter</Link>
        {" · "}
        <Link href="/letters/folds" className="text-seal">All folds</Link>
      </p>
      <p className="mt-6 font-display text-3xl" data-testid="fold-line">
        {foldLine(letter.foldPattern)}
      </p>
      <div className="mt-8 flex gap-2" data-testid="fold-diagram">
        {Array.from({ length: panels || 1 }).map((_, index) => (
          <div key={index} className="h-40 flex-1 rounded-md border border-bark/20 bg-paper" />
        ))}
      </div>
      <ol className="mt-8 space-y-2" data-testid="fold-steps">
        {steps.map((step) => (
          <li key={step} className="paper-card p-4">
            {step}
          </li>
        ))}
      </ol>
      {canWrite(ctx.role) ? <FoldForm letterId={letter.id} foldPattern={letter.foldPattern} /> : null}
      <CiteBlock title={foldDiagramHeading(letter.title)} path={`/letters/${letter.id}/fold`} />
    </AppShell>
  );
}
