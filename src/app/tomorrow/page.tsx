import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { loadFamilyReminders } from "@/lib/familyDates";
import { remindersTomorrow, tomorrowHeading } from "@/lib/reminders";

export default async function TomorrowPage() {
  const ctx = await requireFamily();
  const { reminders } = await loadFamilyReminders(ctx.family.id, ctx.role);
  const tomorrow = remindersTomorrow(reminders);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="tomorrow-heading">{tomorrowHeading(tomorrow.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">A reminder the day before a family date.</p>
      <ul className="mt-10 space-y-3" data-testid="tomorrow-list">
        {tomorrow.map((item) => (
          <li key={item.id} className="paper-card flex flex-wrap items-baseline justify-between gap-3 p-5">
            <Link href={`/people/${item.personId}`} className="font-display text-2xl text-seal">{item.title}</Link>
            <span className="font-sans text-sm text-gold">{item.monthDay}</span>
          </li>
        ))}
        {!tomorrow.length ? <li className="text-bark">No family date falls tomorrow.</li> : null}
      </ul>
    </AppShell>
  );
}
