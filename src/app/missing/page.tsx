import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { isParentRel } from "@/lib/rels";
import { missingInformation } from "@/lib/missing";

const labels = {
  parents: "No parents",
  dates: "No dates",
  photo: "No photograph",
  story: "No story",
};

export default async function MissingPage() {
  const ctx = await requireFamily();
  const [people, relationships, tags, stories, storyLinks] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.personTag.findMany({
      where: { person: { familyId: ctx.family.id }, asset: { deletedAt: null } },
      select: { personId: true },
    }),
    prisma.story.findMany({ where: { familyId: ctx.family.id }, select: { tellerPersonId: true } }),
    prisma.storyPerson.findMany({
      where: { story: { familyId: ctx.family.id } },
      select: { personId: true },
    }),
  ]);
  const missing = missingInformation({
    people,
    parentIds: new Set(relationships.filter((rel) => isParentRel(rel.type)).map((rel) => rel.toPersonId)),
    photoIds: new Set(tags.map((tag) => tag.personId)),
    storyIds: new Set([
      ...stories.map((story) => story.tellerPersonId).filter((id): id is string => Boolean(id)),
      ...storyLinks.map((link) => link.personId),
    ]),
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-heading">Still missing</h1>
      <p className="mt-3 max-w-2xl text-bark">People with no parents, no dates, no photograph, or no story yet.</p>
      <ul className="mt-10 space-y-3" data-testid="missing-list">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
            <p className="font-sans text-sm text-gold">{row.kinds.map((kind) => labels[kind]).join(" · ")}</p>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every person has parents, a date, a photograph, and a story.</li> : null}
      </ul>
    </AppShell>
  );
}
