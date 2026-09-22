import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { groupSurnames } from "@/lib/surnames";

export default async function SurnamesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id },
    include: { names: true },
    orderBy: { displayName: "asc" },
  });
  const groups = groupSurnames(people);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="surnames-heading">Surname index</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Every last name, maiden name, and also-known-as the archive already knows.{" "}
        <Link href="/surnames/map" className="text-seal">Surname map</Link>.
      </p>
      <ul className="mt-10 space-y-4" data-testid="surnames-list">
        {groups.map((group) => (
          <li key={group.surname} className="paper-card p-5">
            <h2 className="font-display text-2xl">{group.surname}</h2>
            <p className="mt-2 font-sans text-sm text-bark">
              {group.people.map((person, index) => (
                <span key={person.id}>
                  {index ? " · " : ""}
                  <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
                </span>
              ))}
            </p>
          </li>
        ))}
        {!groups.length ? <li className="text-bark">Add people to build the index.</li> : null}
      </ul>
    </AppShell>
  );
}
