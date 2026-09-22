import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { cousinsOf } from "@/lib/moreFamily";

export default async function CousinsPage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const me = people.find((person) => person.id === ctx.membership.personId) ?? null;
  const cousins = me ? cousinsOf(me.id, people, relationships) : [];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="cousins-heading">Cousins</h1>
      <p className="mt-3 max-w-2xl text-bark">
        {me ? (
          <>Children of {me.displayName}&apos;s aunts and uncles.</>
        ) : (
          <>
            <Link href="/me" className="text-seal">Say which person is you</Link> to see your cousins.
          </>
        )}
      </p>
      <p className="mt-3 font-sans text-sm">
        <Link href={me ? `/cousins/worksheet?personId=${me.id}` : "/cousins/worksheet"} className="text-seal">
          Cousin worksheet
        </Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="cousins-list">
        {cousins.map((cousin) => (
          <li key={cousin.id} className="paper-card p-5">
            <Link href={`/people/${cousin.id}`} className="font-display text-2xl text-seal">{cousin.displayName}</Link>
            {cousin.via ? <p className="font-sans text-sm text-gold">through {cousin.via}</p> : null}
          </li>
        ))}
        {me && !cousins.length ? <li className="text-bark">No cousins recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
