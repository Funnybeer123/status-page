import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideEventFromViewer } from "@/lib/privacy";
import { barePreferredHeading, compilePreferredDates } from "@/lib/factConfidence";

export default async function BarePreferredDatesPage() {
  const ctx = await requireFamily();
  const events = await prisma.lifeEvent.findMany({
    where: { familyId: ctx.family.id, preferred: true },
    include: { person: true, citations: true },
  });
  const items = compilePreferredDates(
    events.filter((event) => !hideEventFromViewer(ctx.role, event) && !event.citations.length),
  );
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="bare-preferred-heading">
        {barePreferredHeading(items.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="bare-preferred">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-4">
            <p className="font-display text-xl">{item.title}</p>
            <p className="text-bark">{item.line}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{barePreferredHeading(0)}</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/dates/preferred" className="text-seal">Preferred dates</Link>
      </p>
    </AppShell>
  );
}
