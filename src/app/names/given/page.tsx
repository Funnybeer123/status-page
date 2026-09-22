import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NamedByForm } from "@/app/register/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileNamedBy, givenNamesHeading, namedByLine } from "@/lib/namedBy";

export default async function NamedByPage() {
  const ctx = await requireFamily();
  const [names, people] = await Promise.all([
    prisma.personName.findMany({
      where: { familyId: ctx.family.id, namedById: { not: null } },
      include: { person: true, namedBy: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const rows = compileNamedBy(
    names
      .filter((name) => name.namedBy)
      .map((name) => ({
        id: name.id,
        name: name.name,
        child: name.person.displayName,
        namedBy: name.namedBy!.displayName,
        childId: name.personId,
        namedById: name.namedById,
      })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="named-by-heading">
        {givenNamesHeading(rows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who named the child. Separate from the nickname board.{" "}
        <Link href="/nicknames" className="text-seal">Nicknames</Link>
        {" · "}
        <Link href="/names" className="text-seal">Maiden and married names</Link>
        {" · "}
        <Link href="/names/given/missing" className="text-seal">Names without who chose them</Link>
      </p>
      {canWrite(ctx.role) ? (
        <NamedByForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="named-by-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.childId}`} className="font-display text-2xl text-seal">{row.child}</Link>
            <p className="text-bark">{namedByLine(row.name, row.namedBy)}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">{givenNamesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
