import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { compileIndexCard, indexCardHeading } from "@/lib/indexCard";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";

export default async function IndexCardPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [person, people, relationships] = await Promise.all([
    prisma.person.findFirst({ where: { id, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  if (!person || hideMinorDetails(ctx.role, person)) notFound();
  const card = compileIndexCard({
    person,
    people: people.filter((row) => !hideMinorDetails(ctx.role, row)),
    relationships,
    hideDates: shouldHideLivingFacts(ctx.role, person),
  });
  return (
    <AppShell>
      <article className="mx-auto max-w-xl print:max-w-none" data-testid="index-card">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Printable index card</p>
        <h1 className="mt-2 font-display text-5xl" data-testid="index-card-heading">{indexCardHeading(person.displayName)}</h1>
        <p className="mt-3 text-xl text-bark" data-testid="index-card-dates">{card.dates}</p>
        <dl className="mt-8 space-y-4">
          <div>
            <dt className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Parents</dt>
            <dd className="mt-1 text-lg" data-testid="index-card-parents">{card.parentLine}</dd>
          </div>
          <div>
            <dt className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Spouses</dt>
            <dd className="mt-1 text-lg" data-testid="index-card-spouses">{card.spouseLine}</dd>
          </div>
          <div>
            <dt className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Children</dt>
            <dd className="mt-1 text-lg" data-testid="index-card-children">{card.childLine}</dd>
          </div>
        </dl>
        <p className="mt-10 font-sans text-sm print:hidden">
          <Link href={`/people/${person.id}`} className="text-seal">The record</Link>
          {" · "}
          <Link href={`/people/${person.id}/packet`} className="text-seal">Person packet</Link>
          {" · "}
          <Link href="/cards" className="text-seal">All index cards</Link>
        </p>
      </article>
    </AppShell>
  );
}
