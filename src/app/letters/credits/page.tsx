import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { transcriptCreditLine, transcriptCreditsHeading } from "@/lib/transcriptLock";

export default async function TranscriptCreditsPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, transcribedById: { not: null }, kind: { not: "story" } },
    include: { transcribedBy: { select: { name: true } } },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="credits-heading">
        {transcriptCreditsHeading(letters.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Who finished each transcript.</p>
      <ul className="mt-10 space-y-3" data-testid="credits-list">
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}`} className="font-display text-2xl text-seal">
              {letter.title}
            </Link>
            <p className="text-bark">{transcriptCreditLine(letter.transcribedBy?.name)}</p>
          </li>
        ))}
        {!letters.length ? <li className="text-bark">No transcription credits yet.</li> : null}
      </ul>
    </AppShell>
  );
}
