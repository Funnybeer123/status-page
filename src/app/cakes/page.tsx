import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { CakeForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { cakeCutterLine, cakesHeading, compileCakes } from "@/lib/cakeCutter";

export default async function CakesPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.cakeCutter.findMany({ where: { familyId: ctx.family.id }, include: { cutter: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileCakes(
    rows.map((row) => ({
      id: row.id,
      cutter: row.cutter.displayName,
      couple: row.couple,
      wedding: row.wedding,
      cutOn: row.cutOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="cakes-heading">
        {cakesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who cut the wedding cake, for which couple, at which wedding.{" "}
        <Link href="/weddings" className="text-seal">Weddings</Link>
        {" · "}
        <Link href="/cakes/missing" className="text-seal">Missing cutter</Link>
      </p>
      {canWrite(ctx.role) ? (
        <CakeForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="cakes-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{cakeCutterLine(row.cutter, row.couple, row.wedding, row.cutKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{cakesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={cakesHeading(compiled.length)} path="/cakes" />
    </AppShell>
  );
}
