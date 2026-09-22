import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TaxForm } from "@/app/path/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { taxListHeading } from "@/lib/taxList";

export default async function TaxListsPage() {
  const ctx = await requireFamily();
  const lists = await prisma.taxList.findMany({
    where: { familyId: ctx.family.id },
    include: { _count: { select: { names: true } } },
    orderBy: [{ year: "asc" }, { place: "asc" }],
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="tax-heading">Tax lists</h1>
      <p className="mt-3 max-w-2xl text-bark">Who was named on a place and year, the way the assessor wrote them.</p>
      {canWrite(ctx.role) ? <TaxForm /> : null}
      <ul className="mt-10 space-y-3" data-testid="tax-list">
        {lists.map((list) => (
          <li key={list.id} className="paper-card p-5">
            <Link href={`/tax/${list.id}`} className="font-display text-2xl text-seal">
              {taxListHeading(list.place, list.year)}
            </Link>
            <p className="text-bark">{list._count.names === 1 ? "1 name" : `${list._count.names} names`}</p>
          </li>
        ))}
        {!lists.length ? <li className="text-bark">No tax lists yet.</li> : null}
      </ul>
    </AppShell>
  );
}
