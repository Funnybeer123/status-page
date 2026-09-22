import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { collectOnThisDay, onThisDayHeading } from "@/lib/onThisDay";
import { loadOnThisDaySources } from "@/lib/familyDates";

export default async function TodayPage() {
  const ctx = await requireFamily();
  const sources = await loadOnThisDaySources(ctx.family.id);
  const items = collectOnThisDay({ ...sources, role: ctx.role });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="today-heading">On this day</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Memories whose month and day match {onThisDayHeading()} — any year the archive already knows.
      </p>
      <ol className="mt-10 space-y-4" data-testid="today-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{item.kind}{item.year ? ` · ${item.year}` : ""}</p>
            <h2 className="mt-2 font-display text-2xl">
              <Link href={item.href} className="hover:text-seal">{item.title}</Link>
            </h2>
            {item.summary ? <p className="mt-2 text-bark">{item.summary}</p> : null}
          </li>
        ))}
        {!items.length ? <li className="text-bark">Nothing dated this month and day yet. Add a birthday, letter, or photograph.</li> : null}
      </ol>
    </AppShell>
  );
}
