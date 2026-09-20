import { AppShell } from "@/components/AppShell";
import { RelatedForm } from "@/app/related/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { howRelated } from "@/lib/related";

export default async function RelatedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireFamily();
  const { from, to } = await searchParams;
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const result = from && to ? howRelated(people, relationships, from, to) : null;

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="related-heading">How are we related?</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Follow parent and partner links already on the tree. The path is the one a relative would walk at a reunion.
      </p>
      <RelatedForm people={people} fromId={from} toId={to} result={result} />
    </AppShell>
  );
}
