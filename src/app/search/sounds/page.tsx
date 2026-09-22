import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { phoneticHeading, phoneticPeople, soundex } from "@/lib/phonetic";

export default async function SoundsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireFamily();
  const q = (await searchParams).q || "";
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { names: true },
    orderBy: { displayName: "asc" },
  });
  const matches = q.trim().length >= 2 ? phoneticPeople(q, people) : [];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="phonetic-heading">
        {q.trim().length >= 2 ? phoneticHeading(q, matches.length) : "Names that sound alike"}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">A misspelling still finds the person — Whiticker finds Whitaker.</p>
      <form className="mt-6 flex flex-wrap gap-3" action="/search/sounds">
        <input name="q" defaultValue={q} placeholder="Whiticker" className="rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <button className="rounded-full bg-seal px-4 py-2 font-sans text-sm text-cream" type="submit">Search by sound</button>
      </form>
      <ul className="mt-10 space-y-3" data-testid="phonetic-list">
        {matches.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">{person.displayName}</Link>
            <p className="font-sans text-sm text-gold">soundex {soundex(person.familyName || person.displayName)}</p>
          </li>
        ))}
        {q.trim().length >= 2 && !matches.length ? <li className="text-bark">No names sound like that.</li> : null}
      </ul>
    </AppShell>
  );
}
