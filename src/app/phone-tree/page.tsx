import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PhoneTreeForm } from "@/app/then-now/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { hideMinorDetails } from "@/lib/privacy";
import { emptyPhoneTreeHeading, phoneTreeHeading, phoneTreeLine, sortPhoneTree } from "@/lib/phoneTree";

export default async function PhoneTreePage() {
  const ctx = await requireFamily();
  const [contacts, people] = await Promise.all([
    prisma.familyPhoneContact.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    }),
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, deathDate: null },
      orderBy: { displayName: "asc" },
    }),
  ]);
  const items = sortPhoneTree(
    contacts.map((row) => ({
      id: row.id,
      personName: row.person.displayName,
      phone: row.phone,
      callOrder: row.callOrder,
      notes: row.notes,
      href: `/people/${row.personId}`,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="phone-tree-heading">
        {items.length ? phoneTreeHeading(items.length) : emptyPhoneTreeHeading()}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who to call when news spreads, in order.{" "}
        <Link href="/phone-tree/missing" className="text-seal">Who still needs a number</Link>
        {" · "}
        <Link href="/party-lines" className="text-seal">Party lines</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PhoneTreeForm
          people={people
            .filter((person) => !hideMinorDetails(ctx.role, person))
            .map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="phone-tree-list">
        {items.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{phoneTreeLine(row.personName, row.phone, row.callOrder)}</p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
            <Link href={row.href} className="mt-2 inline-block font-sans text-sm text-seal">{row.personName}</Link>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{emptyPhoneTreeHeading()}</li> : null}
      </ol>
    </AppShell>
  );
}
