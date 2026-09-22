import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { proofListHeading } from "@/lib/proofBoard";
import { shouldHideLivingFacts } from "@/lib/privacy";

export default async function ProofListPage() {
  const ctx = await requireFamily();
  const citations = await prisma.citation.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
    orderBy: { claim: "asc" },
  });
  const visible = citations.filter((item) => !shouldHideLivingFacts(ctx.role, item.person));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="proof-list-heading">{proofListHeading(visible.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="proof-list">
        {visible.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={`/proof/${item.id}`} className="font-display text-2xl text-seal">{item.claim}</Link>
            {item.person ? <p className="text-bark">{item.person.displayName}</p> : null}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
