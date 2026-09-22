import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function ExtractsPage() {
  const ctx = await requireFamily();
  const [households, registers, taxLists, voyages] = await Promise.all([
    prisma.censusHousehold.count({ where: { familyId: ctx.family.id } }),
    prisma.churchRegister.count({ where: { familyId: ctx.family.id } }),
    prisma.taxList.count({ where: { familyId: ctx.family.id } }),
    prisma.voyage.count({ where: { familyId: ctx.family.id } }),
  ]);
  const links = [
    { href: "/households", label: "Census households", count: households },
    { href: "/registers", label: "Church registers", count: registers },
    { href: "/tax", label: "Tax lists", count: taxLists },
    { href: "/voyages", label: "Passenger lists", count: voyages },
  ];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="extracts-heading">Source extracts</h1>
      <p className="mt-3 max-w-2xl text-bark">Households, parish lines, tax names, and passenger lists in one place.</p>
      <ul className="mt-10 space-y-3" data-testid="extracts-list">
        {links.map((link) => (
          <li key={link.href} className="paper-card p-5">
            <Link href={link.href} className="font-display text-2xl text-seal">{link.label}</Link>
            <p className="text-bark">{link.count}</p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
