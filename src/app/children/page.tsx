import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { livingMinors } from "@/lib/children";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function ChildrenPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const rows = canWrite(ctx.role) ? livingMinors(people) : [];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="children-heading">Living children</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Share links and viewer accounts do not show these details or photographs. Contributors still see them here so the family can keep them safe.
      </p>
      <ul className="mt-10 space-y-3" data-testid="children-list">
        {rows.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">{person.displayName}</Link>
            <p className="font-sans text-sm text-bark">
              Born {formatDate(person.birthDate)}
              {person.age != null ? ` · age ${person.age}` : ""}
            </p>
          </li>
        ))}
        {!canWrite(ctx.role) ? (
          <li className="text-bark" data-testid="children-hidden">Living children’s names stay with contributors.</li>
        ) : null}
        {canWrite(ctx.role) && !rows.length ? <li className="text-bark">No living minors on the tree.</li> : null}
      </ul>
    </AppShell>
  );
}
