import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { lettersReadyHeading } from "@/lib/readAloud";

export default async function LettersAloudIndexPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: {
      familyId: ctx.family.id,
      deletedAt: null,
      kind: { in: ["letter", "note"] },
      transcript: { not: "" },
    },
    orderBy: { writtenAt: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="letters-aloud-heading">{lettersReadyHeading(letters.length)}</h1>
      <ul className="mt-10 space-y-3">
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}/aloud`} className="font-display text-2xl text-seal">{letter.title}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
