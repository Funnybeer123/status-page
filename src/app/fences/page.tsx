import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { FenceForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileFences, fenceViewerLine, fenceViewersHeading } from "@/lib/fenceViewer";

export default async function Page() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.fenceViewer.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileFences(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      neighbors: row.neighbors,
      walkedOn: row.walkedOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="fences-heading">
        {fenceViewersHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who walked the line, and for which neighbors. 
        <Link href="/fences/missing" className="text-seal">Missing fence-viewer</Link>
      </p>
      {canWrite(ctx.role) ? (
        <FenceForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="fences-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{fenceViewerLine(row.person, row.neighbors, row.walkKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{fenceViewersHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={fenceViewersHeading(compiled.length)} path="/fences" />
    </AppShell>
  );
}
