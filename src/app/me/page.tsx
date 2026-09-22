import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MeForm } from "@/app/me/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { howRelated } from "@/lib/related";

export default async function MePage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const me = people.find((person) => person.id === ctx.membership.personId) ?? null;
  const relatives = me
    ? people
        .filter((person) => person.id !== me.id)
        .map((person) => howRelated(people, relationships, me.id, person.id))
        .filter((item) => item.found)
        .slice(0, 8)
    : [];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="me-heading">This is me</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Link your signed-in account to a person on the tree. Relatedness and the family home will start from you.
      </p>
      {me ? (
        <p className="mt-6 font-display text-2xl" data-testid="me-name">
          You are <Link href={`/people/${me.id}`} className="text-seal">{me.displayName}</Link>
        </p>
      ) : (
        <p className="mt-6 text-bark">Choose the person who is you.</p>
      )}
      <MeForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} personId={me?.id} />
      {relatives.length ? (
        <ul className="mt-10 space-y-3" data-testid="me-related">
          {relatives.map((item) => (
            <li key={item.toId} className="paper-card p-4">
              <Link href={`/people/${item.toId}`} className="font-display text-xl text-seal">{item.sentence}</Link>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
