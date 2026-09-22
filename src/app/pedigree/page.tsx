import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { drawnPedigreeHeading } from "@/lib/drawnPedigree";

export default async function PedigreeIndexPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="pedigree-index-heading">Hand-drawn pedigrees</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Print a wavy-ink poster for one person.{" "}
        <Link href="/tree/poster" className="text-seal">The generation poster</Link>
        {" · "}
        <Link href="/pedigree/missing" className="text-seal">People without parents</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="pedigree-people">
        {visible.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}/pedigree`} className="font-display text-2xl text-seal">
              {drawnPedigreeHeading(person.displayName)}
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
