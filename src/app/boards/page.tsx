import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { BoardForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { boardYears, compileBoards, schoolBoardLine, schoolBoardsHeading } from "@/lib/schoolBoard";

export default async function BoardsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.schoolBoardTerm.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileBoards(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      office: row.office,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="boards-heading">
        {schoolBoardsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A school-board term: who served, and in which office.{" "}
        <Link href="/boards/missing" className="text-seal">Missing term</Link>
      </p>
      {canWrite(ctx.role) ? (
        <BoardForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="boards-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{schoolBoardLine(row.person, row.office, boardYears(row.startedOn, row.endedOn))}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{schoolBoardsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={schoolBoardsHeading(compiled.length)} path="/boards" />
    </AppShell>
  );
}
