import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { groupByYear } from "@/lib/moreFamily";
import { formatDate } from "@/lib/dates";

export default async function CorrespondencePage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: { in: ["letter", "note"] }, deletedAt: null },
    include: { people: { include: { person: true } } },
    orderBy: { writtenAt: "desc" },
  });
  const groups = groupByYear(letters);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="correspondence-heading">Correspondence</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Letters and notes grouped by the year they were written.{" "}
        <Link href="/correspondence/single" className="text-seal">Single-letter threads</Link>
      </p>
      <div className="mt-10 space-y-8" data-testid="correspondence-list">
        {groups.map(([year, items]) => (
          <section key={year}>
            <h2 className="font-display text-2xl">{year}</h2>
            <ul className="mt-3 space-y-2">
              {items.map((letter) => (
                <li key={letter.id} className="paper-card p-4">
                  <Link href={`/letters/${letter.id}`} className="font-display text-xl text-seal">{letter.title}</Link>
                  <p className="font-sans text-sm text-bark">
                    {formatDate(letter.writtenAt, "Undated")}
                    {letter.people.length ? ` · ${letter.people.map((item) => item.person.displayName).join(", ")}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length ? <p className="text-bark">No letters yet.</p> : null}
      </div>
    </AppShell>
  );
}
