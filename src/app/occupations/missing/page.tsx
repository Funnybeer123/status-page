import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { missingOccupationsHeading } from "@/lib/occupations";
import { hideMinorDetails } from "@/lib/privacy";

export default async function MissingOccupationsPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive, occupations: { none: {} } },
    orderBy: { displayName: "asc" },
  });
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-occupations-heading">
        {missingOccupationsHeading(visible.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Relatives who still need work recorded.{" "}
        <Link href="/occupations" className="text-seal">Occupations</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="missing-occupations">
        {visible.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}/occupations`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
          </li>
        ))}
        {!visible.length ? <li className="text-bark">Every adult has an occupation on the timeline.</li> : null}
      </ul>
    </AppShell>
  );
}
