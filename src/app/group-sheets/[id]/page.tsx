import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileGroupSheet } from "@/lib/groupSheet";
import { formatDate, lifespan } from "@/lib/dates";

export default async function GroupSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [people, relationships, events] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.lifeEvent.findMany({ where: { familyId: ctx.family.id }, include: { place: true } }),
  ]);
  const sheet = compileGroupSheet(id, people, relationships, events);
  if (!sheet) notFound();
  return (
    <AppShell>
      <div className="print:hidden">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Printable group sheet</p>
        <h1 className="mt-2 font-display text-4xl" data-testid="group-sheet-heading">{sheet.person.displayName}</h1>
        <p className="mt-3 max-w-2xl text-bark">Parents, spouses, and children on one page.</p>
      </div>
      <article className="mt-8 paper-card p-6" data-testid="group-sheet">
        <h2 className="font-display text-3xl">{sheet.person.displayName}</h2>
        <p className="font-sans text-sm text-gold">{lifespan(sheet.person.birthDate, sheet.person.deathDate)}</p>
        {sheet.marriage?.date ? (
          <p className="mt-2 text-bark">Married {sheet.marriage.date}{sheet.marriage.place ? ` · ${sheet.marriage.place}` : ""}</p>
        ) : null}
        <section className="mt-6">
          <h3 className="font-display text-2xl">Parents</h3>
          <ul className="mt-2 space-y-1">
            {sheet.parents.map((parent) => (
              <li key={parent.id}>
                <Link href={`/people/${parent.id}`} className="text-seal">{parent.displayName}</Link>
                <span className="ml-2 font-sans text-sm text-bark">{lifespan(parent.birthDate, parent.deathDate)}</span>
              </li>
            ))}
            {!sheet.parents.length ? <li className="text-bark">Parents not recorded.</li> : null}
          </ul>
        </section>
        <section className="mt-6">
          <h3 className="font-display text-2xl">Spouses</h3>
          <ul className="mt-2 space-y-2">
            {sheet.spouses.map((spouse) => (
              <li key={spouse.id}>
                <Link href={`/people/${spouse.id}`} className="text-seal">{spouse.displayName}</Link>
                <span className="ml-2 font-sans text-sm text-bark">{lifespan(spouse.birthDate, spouse.deathDate)}</span>
                {sheet.spouseParents.find((row) => row.spouseId === spouse.id)?.parents.length ? (
                  <p className="font-sans text-sm text-bark">
                    Parents: {sheet.spouseParents.find((row) => row.spouseId === spouse.id)?.parents.map((parent) => parent.displayName).join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
            {!sheet.spouses.length ? <li className="text-bark">No spouse recorded.</li> : null}
          </ul>
        </section>
        <section className="mt-6">
          <h3 className="font-display text-2xl">Children</h3>
          <ul className="mt-2 space-y-2" data-testid="group-sheet-children">
            {sheet.children.map((child) => (
              <li key={child.person.id}>
                <Link href={`/people/${child.person.id}`} className="text-seal">{child.person.displayName}</Link>
                {child.dates ? <span className="ml-2 font-sans text-sm text-bark">{child.dates}</span> : null}
                {child.spouses.length ? (
                  <span className="ml-2 font-sans text-sm text-bark">
                    m. {child.spouses.map((spouse) => spouse.displayName).join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
            {!sheet.children.length ? <li className="text-bark">No children recorded.</li> : null}
          </ul>
        </section>
        <p className="mt-6 font-sans text-xs text-gold print:block hidden">Printed {formatDate(new Date())}</p>
      </article>
      <p className="mt-6 print:hidden font-sans text-sm">
        <Link href={`/people/${sheet.person.id}`} className="text-seal">Person record</Link>
        {" · "}
        <Link href={`/people/${sheet.person.id}/report`} className="text-seal">Descendant report</Link>
      </p>
    </AppShell>
  );
}
