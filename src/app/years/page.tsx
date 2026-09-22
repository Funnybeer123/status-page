import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { groupByYear } from "@/lib/moreFamily";
import { formatDate } from "@/lib/dates";

export default async function YearsPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    orderBy: { writtenAt: "desc" },
  });
  const groups = groupByYear(letters);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="years-heading">Letters by year</h1>
      <p className="mt-3 max-w-2xl text-bark">Every transcript on the archive, stacked by the year on the page.</p>
      <div className="mt-10 space-y-8" data-testid="years-list">
        {groups.map(([year, items]) => (
          <section key={year}>
            <h2 className="font-display text-2xl">{year}</h2>
            <ul className="mt-3 space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Link href={`/letters/${item.id}`} className="text-seal">{item.title}</Link>
                  <span className="ml-2 font-sans text-sm text-bark">{formatDate(item.writtenAt, "")}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length ? <p className="text-bark">Nothing dated yet.</p> : null}
      </div>
    </AppShell>
  );
}
