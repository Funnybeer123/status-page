import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { TeamForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileHorseTeams, horseTeamLine, horseTeamsHeading } from "@/lib/horseTeam";

export default async function TeamsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.horseTeam.findMany({ where: { familyId: ctx.family.id }, include: { lender: true, borrower: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileHorseTeams(
    rows.map((row) => ({
      id: row.id,
      lender: row.lender.displayName,
      borrower: row.borrower.displayName,
      purpose: row.purpose,
      loanedOn: row.loanedOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="teams-heading">
        {horseTeamsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who loaned the team of horses, who borrowed it, and what the team was for.{" "}
        <Link href="/teams/missing" className="text-seal">Missing team</Link>
      </p>
      {canWrite(ctx.role) ? (
        <TeamForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="teams-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{horseTeamLine(row.lender, row.borrower, row.purpose, row.loanKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{horseTeamsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={horseTeamsHeading(compiled.length)} path="/teams" />
    </AppShell>
  );
}
