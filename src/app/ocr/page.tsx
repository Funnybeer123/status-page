import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { OcrReviewForm } from "@/app/ocr/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function OcrQueuePage() {
  const ctx = await requireFamily();
  const documents = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, needsReview: true },
    include: { people: { include: { person: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="ocr-heading">OCR review</h1>
      <p className="mt-3 max-w-2xl text-bark">Pages that need a human to check the transcript.</p>
      <ul className="mt-10 space-y-4" data-testid="ocr-list">
        {documents.map((document) => (
          <li key={document.id} className="paper-card p-5">
            <Link href={`/letters/${document.id}`} className="font-display text-2xl text-seal">{document.title}</Link>
            <p className="font-sans text-sm text-gold">{formatDate(document.writtenAt, "Undated")}</p>
            <p className="mt-2 line-clamp-4 text-bark">{document.transcript}</p>
            {canWrite(ctx.role) ? <OcrReviewForm documentId={document.id} transcript={document.transcript} /> : null}
          </li>
        ))}
        {!documents.length ? <li className="text-bark">Nothing waiting for a human pass.</li> : null}
      </ul>
    </AppShell>
  );
}
