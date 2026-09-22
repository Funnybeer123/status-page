import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { howRelated } from "@/lib/related";
import { relatedCardHeading, relatedCardLine, samePersonCardHeading } from "@/lib/relatedCard";

export default async function RelatedCardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireFamily();
  const { from, to } = await searchParams;
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const fromId = from || ctx.membership.personId || "";
  const toId = to || "";
  const result = fromId && toId ? howRelated(people, relationships, fromId, toId) : null;
  const fromName = people.find((person) => person.id === fromId)?.displayName;
  const toName = people.find((person) => person.id === toId)?.displayName;
  const heading =
    result?.relation === "the same person"
      ? samePersonCardHeading(fromName)
      : relatedCardHeading(fromName, toName);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold print:hidden">Printable related card</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="related-card-heading">
        {fromId && toId ? heading : "How we are related"}
      </h1>
      <p className="mt-3 text-bark print:hidden">
        One page for two people.{" "}
        <Link href="/related" className="text-seal">How are we related?</Link>
        {" · "}
        <Link href="/related/card/missing" className="text-seal">Choose two people</Link>
      </p>
      {result ? (
        <article className="mx-auto mt-10 max-w-xl paper-card p-10" data-testid="related-card">
          <p className="font-display text-3xl">{fromName}</p>
          <p className="mt-2 font-sans text-xs uppercase tracking-[0.2em] text-gold">{result.relation}</p>
          <p className="mt-4 text-lg" data-testid="related-card-line">
            {relatedCardLine(result)}
          </p>
          <ol className="mt-6 space-y-1 text-bark">
            {result.steps.map((step, index) => (
              <li key={`${step.fromId}-${step.toId}-${index}`}>
                {step.fromName} is {step.label} {step.toName}
              </li>
            ))}
          </ol>
        </article>
      ) : (
        <p className="mt-10 text-bark">Choose two people from How are we related?</p>
      )}
      <CiteBlock title={heading} path={`/related/card?from=${fromId}&to=${toId}`} />
    </AppShell>
  );
}
