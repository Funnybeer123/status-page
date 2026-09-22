import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hasFold, missingFoldHeading } from "@/lib/letterFold";

export default async function MissingFoldsPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { writtenAt: "asc" },
  });
  const missing = letters.filter((letter) => !hasFold(letter));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-folds-heading">
        {missingFoldHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-folds-list">
        {missing.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}/fold`} className="font-display text-2xl text-seal">
              {letter.title}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingFoldHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
