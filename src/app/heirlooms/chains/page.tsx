import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { chainsHeading, currentHolder, currentHolderLine, holdLine, provenanceHeading, sortHolds } from "@/lib/provenance";

export default async function HeirloomChainsPage() {
  const ctx = await requireFamily();
  const heirlooms = await prisma.heirloom.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, holds: { include: { person: true } } },
    orderBy: { title: "asc" },
  });
  const chains = heirlooms
    .map((item) => ({ ...item, holds: sortHolds(item.holds) }))
    .filter((item) => item.holds.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="chains-heading">
        {chainsHeading(chains.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Every heirloom’s chain of who held it, in order.{" "}
        <Link href="/heirlooms" className="text-seal">All heirlooms</Link>.
      </p>
      <ul className="mt-10 space-y-6" data-testid="chains-list">
        {chains.map((item) => {
          const holder = currentHolder(item.holds);
          return (
            <li key={item.id} className="paper-card p-5">
              <Link href={`/heirlooms/${item.id}`} className="font-display text-2xl text-seal">
                {provenanceHeading(item.title, item.holds.length)}
              </Link>
              <p className="mt-2 text-bark">
                {currentHolderLine(item.title, holder?.person.displayName ?? item.person?.displayName)}
              </p>
              <ol className="mt-3 space-y-1 font-sans text-sm text-bark">
                {item.holds.map((hold) => (
                  <li key={hold.id}>
                    {holdLine(hold.person.displayName, formatDate(hold.heldFrom, ""), formatDate(hold.heldUntil, "") || null)}
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
        {!chains.length ? <li className="text-bark">No heirloom chains recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
