import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SharedForm } from "@/app/shared/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { findSharedAncestors } from "@/lib/sharedAncestors";

export default async function SharedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const [people, relationships, documents] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id },
      include: { people: { include: { person: true } } },
      orderBy: { title: "asc" },
    }),
  ]);
  const fromId = people.some((person) => person.id === params.from) ? params.from : undefined;
  const toId = people.some((person) => person.id === params.to) ? params.to : undefined;
  const ancestors = fromId && toId ? findSharedAncestors(fromId, toId, people, relationships) : [];
  const sharedDocs =
    fromId && toId
      ? documents.filter((document) => {
          const ids = new Set(document.people.map((item) => item.personId));
          return ids.has(fromId) && ids.has(toId);
        })
      : [];
  const fromName = people.find((person) => person.id === fromId)?.displayName;
  const toName = people.find((person) => person.id === toId)?.displayName;

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="shared-heading">Shared ancestors</h1>
      <p className="mt-3 max-w-2xl text-bark">Pick two relatives. The archive walks both lines until they meet.</p>
      <SharedForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} fromId={fromId} toId={toId} />
      {fromId && toId ? (
        <>
          <ul className="mt-10 space-y-3" data-testid="shared-list">
            {ancestors.map((ancestor) => (
              <li key={ancestor.id} className="paper-card p-5">
                <Link href={`/people/${ancestor.id}`} className="font-display text-2xl text-seal">{ancestor.displayName}</Link>
                <p className="font-sans text-sm text-bark">
                  {ancestor.fromA} generations from {fromName} · {ancestor.fromB} generations from {toName}
                </p>
              </li>
            ))}
            {!ancestors.length ? (
              <li className="text-bark">No shared ancestor is recorded yet.</li>
            ) : null}
          </ul>
          <section className="mt-10">
            <h2 className="font-display text-2xl">Letters that name both</h2>
            <ul className="mt-4 space-y-2">
              {sharedDocs.map((document) => (
                <li key={document.id}>
                  <Link href={`/letters/${document.id}`} className="text-seal">{document.title}</Link>
                </li>
              ))}
              {!sharedDocs.length ? <li className="text-bark">None yet.</li> : null}
            </ul>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
