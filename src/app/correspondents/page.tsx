import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function CorrespondentsPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: { in: ["letter", "note"] }, deletedAt: null },
    include: { people: { include: { person: true } } },
    orderBy: { writtenAt: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="correspondents-heading">Correspondents</h1>
      <p className="mt-3 max-w-2xl text-bark">Who is named on each letter — the people who wrote and were written to.</p>
      <ul className="mt-10 space-y-3" data-testid="correspondents-list">
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}`} className="font-display text-2xl text-seal">{letter.title}</Link>
            <p className="font-sans text-sm text-gold">{formatDate(letter.writtenAt, "Undated")}</p>
            <p className="mt-2 text-bark">
              {letter.people.map((item) => item.person.displayName).join(" · ") || "No one linked yet"}
            </p>
          </li>
        ))}
        {!letters.length ? <li className="text-bark">No letters yet.</li> : null}
      </ul>
    </AppShell>
  );
}
