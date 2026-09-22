import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { peopleWithTwoLetters, peopleWithTwoLettersHeading } from "@/lib/letterPair";

export default async function PeopleWithTwoLettersPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.letter, deletedAt: null },
    include: { people: { include: { person: true } } },
  });
  const people = peopleWithTwoLetters(
    letters.map((letter) => ({
      ...letter,
      people: letter.people.map((row) => ({ personId: row.personId, displayName: row.person.displayName })),
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="people-with-two-letters-heading">
        {peopleWithTwoLettersHeading(people.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="people-with-two-letters">
        {people.map((group) => (
          <li key={group.personId} className="paper-card p-5">
            <Link href={`/letters/pair?personId=${group.personId}`} className="font-display text-2xl text-seal">
              {group.displayName}
            </Link>
            <p className="text-bark">{group.letters.length} letters</p>
          </li>
        ))}
        {!people.length ? <li className="text-bark">No one has two letters to compare yet.</li> : null}
      </ul>
    </AppShell>
  );
}
