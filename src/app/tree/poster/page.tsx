import Link from "next/link";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { posterGroupLine, posterHeading, posterRows } from "@/lib/treePoster";

export default async function TreePosterPage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const treePeople = people.map((person) => ({ ...person, profileUrl: null }));
  const rows = posterRows(treePeople, relationships);
  return (
    <main className="mx-auto max-w-5xl px-8 py-12">
      <div className="print:hidden">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
        <h1 className="mt-2 font-display text-5xl" data-testid="tree-poster-heading">{posterHeading(ctx.family.name)}</h1>
        <p className="mt-3 text-bark">
          Large type for a wall. Print this page. <Link href="/tree" className="text-seal">Back to the tree</Link>
        </p>
      </div>
      <article className="mt-10 space-y-10" data-testid="tree-poster">
        {rows.map((row) => (
          <section key={row.generation}>
            <h2 className="font-display text-4xl text-gold">{row.label}</h2>
            <ul className="mt-4 space-y-3">
              {row.groups.map((group, index) => (
                <li key={`${row.generation}-${index}`} className="font-display text-5xl leading-tight">
                  {posterGroupLine(group.map((person) => person.name))}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!rows.length ? <p className="text-bark">Add people to print a poster.</p> : null}
      </article>
    </main>
  );
}
