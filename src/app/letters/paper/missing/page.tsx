import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hasPaperMill, missingPaperHeading } from "@/lib/paperMill";

export default async function MissingPaperPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { title: "asc" },
  });
  const missing = letters.filter((letter) => !hasPaperMill(letter));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-paper-heading">
        {missingPaperHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-paper-list">
        {missing.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}`} className="font-display text-2xl text-seal">{letter.title}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingPaperHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
