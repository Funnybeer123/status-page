import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLanguages } from "@/lib/languages";
import { alive } from "@/lib/alive";

export default async function LanguagesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    select: { id: true, displayName: true, languages: true },
  });
  const groups = compileLanguages(people);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="languages-heading">Languages spoken</h1>
      <p className="mt-3 max-w-2xl text-bark">What the family still speaks, and who kept each tongue.</p>
      <ul className="mt-10 space-y-3" data-testid="languages-list">
        {groups.map((group) => (
          <li key={group.language} className="paper-card p-5">
            <p className="font-display text-2xl">{group.language}</p>
            <p className="text-bark">
              {group.people.map((person, index) => (
                <span key={person.id}>
                  {index ? " · " : ""}
                  <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
                </span>
              ))}
            </p>
          </li>
        ))}
        {!groups.length ? <li className="text-bark">No languages recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
