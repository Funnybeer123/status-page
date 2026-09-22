import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BirthDateForm } from "@/app/firsts/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { canWrite } from "@/lib/roles";
import { missingBirthsHeading, needsBirthDate } from "@/lib/missingBirths";

export default async function MissingBirthsPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter((person) => needsBirthDate(person) && !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-births-heading">{missingBirthsHeading(missing.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Open the person form and add the birth date.{" "}
        <Link href="/missing" className="text-seal">Everything still missing</Link>
      </p>
      <ul className="mt-10 space-y-4" data-testid="missing-births">
        {missing.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">{person.displayName}</Link>
            {canWrite(ctx.role) ? <BirthDateForm personId={person.id} name={person.displayName} /> : null}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
