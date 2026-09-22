import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BranchForm } from "@/app/branches/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { branchGedcomHeading } from "@/lib/webcal";
import { branchColorLine, normalizeBranchColor } from "@/lib/branchColor";
import { BranchColorForm } from "@/app/memory-lane/ui";

export default async function BranchesPage() {
  const ctx = await requireFamily();
  const [people, branches] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.familyBranch.findMany({
      where: { familyId: ctx.family.id },
      include: { members: { include: { person: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="branches-heading">Family branches</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Named lines such as the Cedar Falls Harts. Open one to filter the tree and the timeline.{" "}
        <Link href="/branches/legend" className="text-seal">Color legend</Link>
      </p>
      {canWrite(ctx.role) ? (
        <BranchForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="branches-list">
        {branches.map((branch) => (
          <li key={branch.id} className="paper-card p-5">
            <p className="flex items-center gap-3 font-display text-2xl">
              {normalizeBranchColor(branch.color) ? (
                <span
                  className="inline-block h-4 w-4 rounded-full border border-bark/20"
                  style={{ backgroundColor: normalizeBranchColor(branch.color) || undefined }}
                />
              ) : null}
              {branch.name}
            </p>
            {branch.color ? <p className="font-sans text-sm text-gold">{branchColorLine(branch.name, branch.color)}</p> : null}
            {branch.summary ? <p className="text-bark">{branch.summary}</p> : null}
            <p className="mt-2 font-sans text-sm text-bark">
              {branch.members.map((member) => member.person.displayName).join(", ") || "No one listed yet"}
            </p>
            <p className="mt-3 font-sans text-sm">
              <Link href={`/tree?branchId=${branch.id}`} className="text-seal">Filter the tree</Link>
              {" · "}
              <Link href={`/timeline?branchId=${branch.id}`} className="text-seal">Filter the timeline</Link>
              {" · "}
              <a href={`/api/gedcom?branchId=${branch.id}`} className="text-seal" data-testid="branch-gedcom">
                {branchGedcomHeading(branch.name)}
              </a>
            </p>
            {canWrite(ctx.role) ? <BranchColorForm branchId={branch.id} color={branch.color} /> : null}
          </li>
        ))}
        {!branches.length ? <li className="text-bark">No named branches yet.</li> : null}
      </ul>
    </AppShell>
  );
}
