import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { foldHeading, foldLine, hasFold } from "@/lib/letterFold";

export default async function FoldsPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] }, foldPattern: { not: null } },
    orderBy: { writtenAt: "asc" },
  });
  const folded = letters.filter(hasFold);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="folds-heading">
        {foldHeading(folded.length)}
      </h1>
      <p className="mt-3 text-bark">
        How each physical page was tucked.{" "}
        <Link href="/letters/folds/missing" className="text-seal">Letters without a fold</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="folds-list">
        {folded.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}/fold`} className="font-display text-2xl text-seal">
              {letter.title}
            </Link>
            <p className="text-bark">{foldLine(letter.foldPattern)}</p>
          </li>
        ))}
        {!folded.length ? <li className="text-bark">{foldHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
