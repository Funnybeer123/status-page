import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingAliveYearHeading, missingBirthForYear } from "@/lib/aliveWhen";
import { hideMinorDetails } from "@/lib/privacy";

export default async function MissingAliveYearPage() {
  const ctx = await requireFamily();
  const people = (await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    orderBy: { displayName: "asc" },
  })).filter((person) => missingBirthForYear(person) && !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-alive-year-heading">
        {missingAliveYearHeading(people.length)}
      </h1>
      <p className="mt-3 text-bark">
        Without a birth year we cannot highlight them on the year slider.{" "}
        <Link href="/tree/when" className="text-seal">Who was alive when</Link>
        {" · "}
        <Link href="/births/missing" className="text-seal">Missing birth dates</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="missing-alive-year-list">
        {people.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
          </li>
        ))}
        {!people.length ? <li className="text-bark">{missingAliveYearHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
