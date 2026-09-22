import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { classHeading } from "@/lib/cityDirectory";
import { classmatesHeading, classmatesOf } from "@/lib/yearExtras";

export default async function ClassmatesPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>;
}) {
  const ctx = await requireFamily();
  const { personId } = await searchParams;
  const [people, classes] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    prisma.schoolClass.findMany({
      where: { familyId: ctx.family.id },
      include: { pupils: { include: { person: true } } },
      orderBy: [{ year: "desc" }, { school: "asc" }],
    }),
  ]);
  const person = people.find((row) => row.id === (personId || people[0]?.id)) ?? null;
  const rows = person ? classmatesOf(person.id, classes) : [];
  const mateCount = rows.reduce((sum, row) => sum + row.mates.length, 0);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="classmates-heading">
        {person ? classmatesHeading(person.displayName, mateCount) : "Classmates"}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Who sat in the same school class.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {people.map((row) => (
          <Link
            key={row.id}
            href={`/classes/mates?personId=${row.id}`}
            className={`rounded-full px-3 py-1 font-sans text-sm ${person?.id === row.id ? "bg-seal text-cream" : "border border-bark/15"}`}
          >
            {row.displayName}
          </Link>
        ))}
      </div>
      <ul className="mt-10 space-y-3" data-testid="classmates-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/classes/${row.id}`} className="font-display text-2xl text-seal">{classHeading(row.school, row.year)}</Link>
            <p className="text-bark">
              {row.mates.map((mate) => mate.person?.displayName || mate.personId).join(", ") || "No other pupils recorded."}
            </p>
          </li>
        ))}
        {person && !rows.length ? <li className="text-bark">No class lists name them yet.</li> : null}
      </ul>
    </AppShell>
  );
}
