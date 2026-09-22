import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingSeatingHeading } from "@/lib/seating";

export default async function MissingSeatingPage() {
  const ctx = await requireFamily();
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id, seats: { none: {} } },
    orderBy: { happenedOn: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-seating-heading">{missingSeatingHeading(reunions.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="missing-seating">
        {reunions.map((reunion) => (
          <li key={reunion.id} className="paper-card p-5">
            <Link href={`/reunions/${reunion.id}/seating`} className="font-display text-2xl text-seal">{reunion.title}</Link>
          </li>
        ))}
        {!reunions.length ? <li className="text-bark">Every reunion already has a seating chart.</li> : null}
      </ul>
    </AppShell>
  );
}
