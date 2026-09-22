import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { notFragileHeading } from "@/lib/fragileLetter";

export default async function NotFragileLettersPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] }, fragileOriginal: false },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="not-fragile-heading">{notFragileHeading(letters.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="not-fragile-letters">
        {letters.map((letter) => (
          <li key={letter.id}>
            <Link href={`/letters/${letter.id}`} className="text-seal">{letter.title}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
