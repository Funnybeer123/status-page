import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { funeralDates, funeralHeading, funeralsHeading } from "@/lib/funeral";
import { isLiving } from "@/lib/privacy";

export default async function FuneralsPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, deathDate: { not: null } },
    orderBy: { displayName: "asc" },
  });
  const programs = people.filter((person) => !isLiving(person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="funerals-heading">{funeralsHeading(programs.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Print-ready programs: dates, a portrait, and a short life.</p>
      <ul className="mt-10 space-y-3" data-testid="funerals-list">
        {programs.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}/funeral`} className="font-display text-2xl text-seal">
              {funeralHeading(person.displayName)}
            </Link>
            <p className="text-bark">{funeralDates(person.birthDate, person.deathDate)}</p>
          </li>
        ))}
        {!programs.length ? <li className="text-bark">No funeral programs yet.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/funerals/missing" className="text-seal">Programs still missing a portrait</Link>
      </p>
    </AppShell>
  );
}
