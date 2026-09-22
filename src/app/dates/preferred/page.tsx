import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideEventFromViewer } from "@/lib/privacy";
import { compilePreferredDates, preferredDatesHeading } from "@/lib/factConfidence";

export default async function PreferredDatesPage() {
  const ctx = await requireFamily();
  const events = await prisma.lifeEvent.findMany({
    where: { familyId: ctx.family.id, preferred: true },
    include: { person: true, citations: true },
    orderBy: { happenedOn: "asc" },
  });
  const items = compilePreferredDates(events.filter((event) => !hideEventFromViewer(ctx.role, event)));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="preferred-dates-heading">
        {preferredDatesHeading(items.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A confidence score next to each preferred date, from the citations the family already attached.{" "}
        <Link href="/quality" className="text-seal">Source quality</Link>
        {" · "}
        <Link href="/conflicts" className="text-seal">Date conflicts</Link>
        {" · "}
        <Link href="/dates/preferred/bare" className="text-seal">Dates still without a source</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="preferred-dates">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-display text-2xl">{item.title}</p>
            <p className="text-bark">{item.personName}</p>
            <p className="mt-2 font-sans text-sm text-gold" data-testid="fact-confidence">{item.line}</p>
            {item.personId ? (
              <Link href={item.href} className="mt-2 inline-block font-sans text-sm text-seal">{item.personName}</Link>
            ) : null}
          </li>
        ))}
        {!items.length ? <li className="text-bark">{preferredDatesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
