import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MiddleNameForm } from "@/app/register/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { hideMinorDetails } from "@/lib/privacy";
import { compileMiddles, middleNameLine, middlesHeading } from "@/lib/middleNames";

export default async function MiddlesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    orderBy: { displayName: "asc" },
  });
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const rows = compileMiddles(visible);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="middles-heading">
        {middlesHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Middle names, separate from the missing birth-date dashboard.{" "}
        <Link href="/births/missing" className="text-seal">Missing birth dates</Link>
        {" · "}
        <Link href="/middles/missing" className="text-seal">Who still needs a middle name</Link>
      </p>
      {canWrite(ctx.role) ? (
        <MiddleNameForm people={visible.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="middles-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
            <p className="text-bark" data-testid="middle-name-line">{middleNameLine(row)}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{middlesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
