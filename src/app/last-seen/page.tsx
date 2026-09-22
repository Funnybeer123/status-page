import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { LastSeenForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { hideMinorDetails } from "@/lib/privacy";
import { compileLastSeen, lastSeenHeading } from "@/lib/lastSeen";

export default async function LastSeenPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    orderBy: { displayName: "asc" },
  });
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const rows = compileLastSeen(visible);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="last-seen-heading">
        {lastSeenHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The last time we saw them, written on the person.{" "}
        <Link href="/last-seen/missing" className="text-seal">Who still needs a last-seen date</Link>
      </p>
      {canWrite(ctx.role) ? (
        <LastSeenForm people={visible.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="last-seen-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.line}</Link>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{lastSeenHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={lastSeenHeading(rows.length)} path="/last-seen" />
    </AppShell>
  );
}
