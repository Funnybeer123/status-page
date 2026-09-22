import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { occupationTimelinesHeading } from "@/lib/occupations";

export default async function OccupationTimelinesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, occupations: { some: {} } },
    include: { _count: { select: { occupations: true } } },
    orderBy: { displayName: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="occupation-timelines-heading">
        {occupationTimelinesHeading(people.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        One timeline per person.{" "}
        <Link href="/occupations" className="text-seal">All occupations</Link>
        {" · "}
        <Link href="/occupations/missing" className="text-seal">Still needed</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="occupation-timelines">
        {people.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}/occupations`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
            <p className="text-bark">{person._count.occupations} occupation{person._count.occupations === 1 ? "" : "s"}</p>
          </li>
        ))}
        {!people.length ? <li className="text-bark">No occupation timelines yet.</li> : null}
      </ul>
    </AppShell>
  );
}
