import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { missingPronunciations, saidAs } from "@/lib/pronounce";

export default async function PronouncePage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const missing = missingPronunciations(people);
  const known = people.filter((person) => person.pronunciation?.trim());
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="pronounce-heading">How to say the names</h1>
      <p className="mt-3 max-w-2xl text-bark">A phonetic spelling on each person, so a grandchild can say it aloud.</p>
      <ul className="mt-10 space-y-3" data-testid="pronounce-list">
        {known.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">{saidAs(person.displayName, person.pronunciation)}</Link>
          </li>
        ))}
        {!known.length ? <li className="text-bark">No pronunciations saved yet.</li> : null}
      </ul>
      <h2 className="mt-12 font-display text-3xl">Still missing</h2>
      <ul className="mt-4 space-y-2" data-testid="pronounce-missing">
        {missing.map((person) => (
          <li key={person.id}>
            <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every name has a pronunciation.</li> : null}
      </ul>
    </AppShell>
  );
}
