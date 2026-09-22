import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { missingPhoneHeading } from "@/lib/phoneTree";

export default async function MissingPhonePage() {
  const ctx = await requireFamily();
  const [people, contacts] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, ...alive, deathDate: null },
      orderBy: { displayName: "asc" },
    }),
    prisma.familyPhoneContact.findMany({
      where: { familyId: ctx.family.id },
      select: { personId: true },
    }),
  ]);
  const listed = new Set(contacts.map((row) => row.personId));
  const missing = people.filter((person) => !listed.has(person.id) && !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-phone-heading">
        {missingPhoneHeading(missing.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="missing-phones">
        {missing.map((person) => (
          <li key={person.id}>
            <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingPhoneHeading(0)}</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/phone-tree" className="text-seal">The phone tree</Link>
      </p>
    </AppShell>
  );
}
