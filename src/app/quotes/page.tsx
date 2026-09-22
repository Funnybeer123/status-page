import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileQuotes } from "@/lib/quotes";

export default async function QuotesPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    orderBy: { writtenAt: "asc" },
  });
  const rows = compileQuotes(
    letters.map((letter) => ({
      id: letter.id,
      title: letter.title,
      body: letter.transcript,
      href: `/letters/${letter.id}/room`,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="quotes-heading">Lines the family still says</h1>
      <p className="mt-3 max-w-2xl text-bark">A sentence from each letter, the way someone would read it aloud.</p>
      <ul className="mt-10 space-y-3" data-testid="quotes-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">“{row.line}”</p>
            <Link href={row.href} className="mt-2 inline-block font-sans text-sm text-seal">{row.title}</Link>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">Add a letter first.</li> : null}
      </ul>
    </AppShell>
  );
}
