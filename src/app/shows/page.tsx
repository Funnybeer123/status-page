import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { ShowForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileShows, medicineShowLine, showsHeading } from "@/lib/medicineShow";

export default async function ShowsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.medicineShowBuy.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileShows(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      item: row.item,
      show: row.show,
      boughtOn: row.boughtOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="shows-heading">
        {showsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A medicine-show purchase: who bought, what they bought, and at which show.{" "}
        <Link href="/shows/missing" className="text-seal">Missing purchase</Link>
      </p>
      {canWrite(ctx.role) ? (
        <ShowForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="shows-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{medicineShowLine(row.person, row.item, row.show, row.buyKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{showsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={showsHeading(compiled.length)} path="/shows" />
    </AppShell>
  );
}
