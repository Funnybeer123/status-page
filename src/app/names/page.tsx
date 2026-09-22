import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { bothNamesHeading, maidenNameLine, marriedNameLine } from "@/lib/nameSearch";
import { hideMinorDetails } from "@/lib/privacy";

export default async function BothNamesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    include: { names: true },
    orderBy: { displayName: "asc" },
  });
  const rows = people
    .filter((person) => !hideMinorDetails(ctx.role, person))
    .filter((person) => person.names.some((name) => name.kind === "maiden"))
    .map((person) => {
      const maiden = person.names.find((name) => name.kind === "maiden");
      return {
        id: person.id,
        displayName: person.displayName,
        maidenLine: maidenNameLine(person.displayName, maiden?.name),
        marriedLine: marriedNameLine(person.displayName, person.familyName),
      };
    });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="both-names-heading">{bothNamesHeading(rows.length)}</h1>
      <ul className="mt-10 space-y-3" data-testid="both-names-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.displayName}</Link>
            <p className="text-bark">{row.maidenLine}</p>
            <p className="text-bark">{row.marriedLine}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">Record a maiden name and search will find both.</li> : null}
      </ul>
    </AppShell>
  );
}
