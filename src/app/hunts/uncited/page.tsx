import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { uncitedCluesHeading } from "@/lib/hunt";

export default async function UncitedCluesPage() {
  const ctx = await requireFamily();
  const clues = await prisma.huntClue.findMany({
    where: { familyId: ctx.family.id, documentId: null, assetId: null, placeId: null },
    include: { hunt: true },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="uncited-clues-heading">{uncitedCluesHeading(clues.length)}</h1>
      <ul className="mt-10 space-y-3">
        {clues.map((clue) => (
          <li key={clue.id} className="paper-card p-5">
            <Link href={`/hunts/${clue.huntId}`} className="font-display text-2xl text-seal">{clue.clue}</Link>
            <p className="text-bark">{clue.hunt.title}</p>
          </li>
        ))}
        {!clues.length ? <li className="text-bark">Every clue already cites the archive.</li> : null}
      </ul>
    </AppShell>
  );
}
