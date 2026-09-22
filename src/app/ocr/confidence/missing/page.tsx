import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { needsOcrConfidence, ocrConfidenceHeading } from "@/lib/ocrConfidence";

export default async function MissingOcrConfidencePage() {
  const ctx = await requireFamily();
  const documents = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, needsReview: true },
  });
  const missing = documents.filter(needsOcrConfidence);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-ocr-confidence-heading">
        {ocrConfidenceHeading(missing.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="missing-ocr-confidence">
        {missing.map((document) => (
          <li key={document.id} className="paper-card p-4">
            <Link href={`/letters/${document.id}`} className="font-display text-xl text-seal">
              {document.title}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{ocrConfidenceHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
