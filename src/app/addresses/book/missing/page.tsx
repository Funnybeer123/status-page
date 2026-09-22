import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileAddressBook, missingAddressHeading } from "@/lib/addressBook";

export default async function MissingAddressesPage() {
  const ctx = await requireFamily();
  const [people, addresses, phones] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.familyAddress.findMany({ where: { familyId: ctx.family.id } }),
    prisma.familyPhoneContact.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const missing = compileAddressBook(people, addresses, phones, ctx.role).filter((row) => !row.line);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-addresses-heading">
        {missingAddressHeading(missing.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="missing-addresses">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-4">
            <Link href={row.href} className="font-display text-xl text-seal">
              {row.displayName}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingAddressHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
