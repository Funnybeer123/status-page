import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { fragileLettersHeading } from "@/lib/fragileLetter";

export default async function FragileLettersPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] }, fragileOriginal: true },
    orderBy: { writtenAt: "asc" },
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="fragile-letters-heading">{fragileLettersHeading(letters.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="fragile-letters">
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}`} className="font-display text-2xl text-seal">{letter.title}</Link>
            <p className="font-sans text-sm text-gold">{formatDate(letter.writtenAt, "Undated")}</p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
