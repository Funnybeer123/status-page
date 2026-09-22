import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { cousinWorksheet, cousinWorksheetHeading } from "@/lib/cousinWorksheet";

export default async function CousinWorksheetPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>;
}) {
  const ctx = await requireFamily();
  const { personId } = await searchParams;
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const focusId = personId || ctx.membership.personId || people[0]?.id;
  const sheet = focusId ? cousinWorksheet(focusId, people, relationships) : null;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="cousin-worksheet-heading">
        {sheet ? cousinWorksheetHeading(sheet.personName) : "Cousin worksheet"}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Children of siblings laid out together
        {sheet?.parentNames.length ? ` — the children of ${sheet.parentNames.join(" and ")}.` : "."}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/cousins/worksheet?personId=${person.id}`}
            className={`rounded-full px-3 py-1 font-sans text-sm ${focusId === person.id ? "bg-seal text-cream" : "border border-bark/15"}`}
          >
            {person.displayName}
          </Link>
        ))}
      </div>
      {sheet ? (
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="cousin-worksheet">
          {sheet.columns.map((column) => (
            <article key={column.siblingId} className="paper-card p-5">
              <Link href={`/people/${column.siblingId}`} className="font-display text-2xl text-seal">{column.siblingName}</Link>
              <ul className="mt-3 space-y-1">
                {column.children.map((child) => (
                  <li key={child.id}>
                    <Link href={`/people/${child.id}`} className="text-seal">{child.name}</Link>
                  </li>
                ))}
                {!column.children.length ? <li className="text-bark">No children recorded.</li> : null}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-bark">Add people and parents to see cousins side by side.</p>
      )}
      <p className="mt-8 font-sans text-sm">
        <Link href="/cousins" className="text-seal">Cousin list</Link>
      </p>
    </AppShell>
  );
}
