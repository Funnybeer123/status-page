import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { neededHeading, peopleNeedingFirst } from "@/lib/startHere";

export default async function NeededPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });
  const [stories, tellers, photos] = await Promise.all([
    prisma.storyPerson.findMany({
      where: { story: { familyId: ctx.family.id } },
      select: { personId: true },
    }),
    prisma.story.findMany({
      where: { familyId: ctx.family.id, tellerPersonId: { not: null } },
      select: { tellerPersonId: true },
    }),
    prisma.personTag.findMany({
      where: { asset: { familyId: ctx.family.id, deletedAt: null } },
      select: { personId: true },
    }),
  ]);
  const withoutStory = peopleNeedingFirst(people, [
    ...stories.map((row) => row.personId),
    ...tellers.map((row) => row.tellerPersonId!).filter(Boolean),
  ]);
  const withoutPhoto = peopleNeedingFirst(
    people,
    photos.map((row) => row.personId),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="needed-heading">{neededHeading(withoutStory.length, withoutPhoto.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Relatives who still need a first story or a first photograph — the next work after start-here.</p>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Still need a story</h2>
        <ul className="mt-4 space-y-2" data-testid="needed-stories">
          {withoutStory.map((person) => (
            <li key={person.id}>
              <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
            </li>
          ))}
          {!withoutStory.length ? <li className="text-bark">Everyone has a story.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Still need a photograph</h2>
        <ul className="mt-4 space-y-2" data-testid="needed-photos">
          {withoutPhoto.map((person) => (
            <li key={person.id}>
              <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
            </li>
          ))}
          {!withoutPhoto.length ? <li className="text-bark">Everyone has a photograph.</li> : null}
        </ul>
      </section>
      <p className="mt-8 font-sans text-sm">
        <Link href="/start" className="text-seal">Start here</Link>
      </p>
    </AppShell>
  );
}
