import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { OcrConfidenceForm } from "@/app/memory-lane/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { ocrConfidenceHeading, ocrConfidenceLine } from "@/lib/ocrConfidence";

export default async function OcrConfidencePage() {
  const ctx = await requireFamily();
  const documents = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, needsReview: true },
    orderBy: { createdAt: "desc" },
  });
  const missing = documents.filter((document) => document.ocrConfidence == null);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="ocr-confidence-heading">
        {ocrConfidenceHeading(missing.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A confidence score on a letter page that still needs review.{" "}
        <Link href="/ocr" className="text-seal">
          OCR review
        </Link>
        {" · "}
        <Link href="/ocr/confidence/missing" className="text-seal">
          Still unscored
        </Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="ocr-confidence-list">
        {documents.map((document) => (
          <li key={document.id} className="paper-card p-5">
            <Link href={`/letters/${document.id}`} className="font-display text-2xl text-seal">
              {document.title}
            </Link>
            <p className="text-bark">{ocrConfidenceLine(document.ocrConfidence)}</p>
            {canWrite(ctx.role) ? (
              <OcrConfidenceForm documentId={document.id} score={document.ocrConfidence} />
            ) : null}
          </li>
        ))}
        {!documents.length ? <li className="text-bark">{ocrConfidenceHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
