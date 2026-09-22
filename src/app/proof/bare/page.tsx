import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { bareProofHeading, proofHasImage } from "@/lib/proofBoard";
import { shouldHideLivingFacts } from "@/lib/privacy";

export default async function BareProofPage() {
  const ctx = await requireFamily();
  const citations = await prisma.citation.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, asset: true, document: { include: { asset: true } } },
    orderBy: { claim: "asc" },
  });
  const bare = citations.filter((item) => !shouldHideLivingFacts(ctx.role, item.person) && !proofHasImage(item));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="bare-proof-heading">{bareProofHeading(bare.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="bare-proof">
        {bare.map((item) => (
          <li key={item.id}>
            <Link href={`/proof/${item.id}`} className="text-seal">{item.claim}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
