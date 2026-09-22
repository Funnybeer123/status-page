import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { InheritanceForm } from "@/app/story-circle/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileInheritances, inheritanceLine, inheritancesHeading } from "@/lib/inheritances";

export default async function InheritancesPage() {
  const ctx = await requireFamily();
  const [items, people, wills, probates] = await Promise.all([
    prisma.inheritanceItem.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, document: true, probate: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: DocKind.will, deletedAt: null },
      orderBy: { title: "asc" },
    }),
    prisma.probateRecord.findMany({ where: { familyId: ctx.family.id }, orderBy: { title: "asc" } }),
  ]);
  const compiled = compileInheritances(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      heir: item.person.displayName,
      source: item.document?.title || item.probate?.title || null,
      notes: item.notes,
      href: item.documentId ? `/letters/${item.documentId}` : `/people/${item.personId}`,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="inheritances-heading">
        {inheritancesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who inherited what, tied to a will or probate.{" "}
        <Link href="/wills" className="text-seal">Wills</Link>
        {" · "}
        <Link href="/probate" className="text-seal">Probate</Link>
        {" · "}
        <Link href="/inheritances/missing" className="text-seal">Wills without a table</Link>
        {" · "}
        <Link href="/inheritances/receipt" className="text-seal">Printable receipt</Link>
      </p>
      {canWrite(ctx.role) ? (
        <InheritanceForm
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          wills={wills.map((will) => ({ id: will.id, title: will.title }))}
          probates={probates.map((row) => ({ id: row.id, title: row.title }))}
        />
      ) : null}
      <table className="mt-10 w-full text-left" data-testid="inheritances-table">
        <thead>
          <tr className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
            <th className="pb-2">Item</th>
            <th className="pb-2">Inherited by</th>
            <th className="pb-2">Source</th>
          </tr>
        </thead>
        <tbody>
          {compiled.map((item) => (
            <tr key={item.id} className="border-t border-bark/10">
              <td className="py-3">
                <Link href={item.href || "/inheritances"} className="text-seal">
                  {item.title}
                </Link>
              </td>
              <td className="py-3">{item.heir}</td>
              <td className="py-3 text-bark">{item.source || inheritanceLine(item.title, item.heir)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!compiled.length ? <p className="mt-6 text-bark">{inheritancesHeading(0)}</p> : null}
      <CiteBlock title={inheritancesHeading(compiled.length)} path="/inheritances" />
    </AppShell>
  );
}
