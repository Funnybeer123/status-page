import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { siblingKind } from "@/lib/rels";
import { birthOrder, birthOrderHeading, birthOrderLine, missingBirthDatesHeading } from "@/lib/birthOrder";
import { formatDate } from "@/lib/dates";
import { hideMinorDetails } from "@/lib/privacy";

export default async function SiblingBirthOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({ where: { id, familyId: ctx.family.id, ...alive } });
  if (!person) notFound();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const set = people.filter((row) => row.id === person.id || siblingKind(person.id, row.id, relationships));
  const ordered = birthOrder(set.filter((row) => !hideMinorDetails(ctx.role, row)));
  const missing = ordered.filter((row) => !row.birthDate);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Birth order</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="birth-order-heading">
        {birthOrderHeading(person.displayName, ordered.length)}
      </h1>
      <p className="mt-3 text-bark">{missingBirthDatesHeading(missing.length)}</p>
      <ol className="mt-10 space-y-3" data-testid="birth-order-list">
        {ordered.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
            <p className="text-bark">{birthOrderLine(row.order, row.displayName, row.birthDate ? formatDate(row.birthDate) : null)}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/siblings" className="text-seal">All sibling sets</Link>
      </p>
    </AppShell>
  );
}
