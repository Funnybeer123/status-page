import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hasEnvelope, missingEnvelopeHeading } from "@/lib/envelope";

export default async function MissingEnvelopesPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { title: "asc" },
  });
  const missing = letters.filter((letter) => !hasEnvelope(letter));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-envelopes-heading">{missingEnvelopeHeading(missing.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="missing-envelopes">
        {missing.map((letter) => (
          <li key={letter.id}>
            <Link href={`/letters/${letter.id}/envelope`} className="text-seal">{letter.title}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
