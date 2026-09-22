import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { shouldHideLivingFacts } from "@/lib/privacy";
import { qualityLabel } from "@/lib/sourceQuality";

export default async function QualityPage() {
  const ctx = await requireFamily();
  const citations = await prisma.citation.findMany({
    where: { familyId: ctx.family.id, quality: { not: null } },
    include: { person: true, document: true },
    orderBy: { claim: "asc" },
  });
  const visible = citations.filter((item) => !shouldHideLivingFacts(ctx.role, item.person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="quality-heading">Source quality</h1>
      <p className="mt-3 max-w-2xl text-bark">Whether a fact came from an original, a copy, or something we are still unsure about.</p>
      <ul className="mt-10 space-y-3" data-testid="quality-list">
        {visible.map((citation) => (
          <li key={citation.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">{qualityLabel(citation.quality)}</p>
            <p className="font-display text-2xl">{citation.claim}</p>
            {citation.person ? (
              <Link href={`/people/${citation.person.id}`} className="font-sans text-sm text-seal">{citation.person.displayName}</Link>
            ) : null}
          </li>
        ))}
        {!visible.length ? <li className="text-bark">No source quality marked yet.</li> : null}
      </ul>
    </AppShell>
  );
}
