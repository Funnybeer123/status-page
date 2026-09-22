import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { addressBookHeading, compileAddressBook } from "@/lib/addressBook";

export default async function AddressBookPage() {
  const ctx = await requireFamily();
  const [people, addresses, phones] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.familyAddress.findMany({ where: { familyId: ctx.family.id } }),
    prisma.familyPhoneContact.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const items = compileAddressBook(people, addresses, phones, ctx.role);
  const heading = addressBookHeading(items.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold print:hidden">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="address-book-heading">
        {heading}
      </h1>
      <p className="mt-3 max-w-2xl text-bark print:hidden">
        A printable book of living relatives.{" "}
        <Link href="/directory" className="text-seal">
          Directory
        </Link>
        {" · "}
        <Link href="/addresses" className="text-seal">
          Street addresses
        </Link>
        {" · "}
        <Link href="/addresses/book/missing" className="text-seal">
          Who still needs an address
        </Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="address-book">
        {items.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={row.href} className="font-display text-2xl text-seal">
              {row.displayName}
            </Link>
            <p className="text-bark">{row.printed}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{addressBookHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={heading} path="/addresses/book" />
    </AppShell>
  );
}
