import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BranchColorForm } from "@/app/memory-lane/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { branchColorLine, branchLegendHeading, normalizeBranchColor } from "@/lib/branchColor";

export default async function BranchLegendPage() {
  const ctx = await requireFamily();
  const branches = await prisma.familyBranch.findMany({
    where: { familyId: ctx.family.id },
    include: { members: { include: { person: true } } },
    orderBy: { name: "asc" },
  });
  const colored = branches.filter((branch) => normalizeBranchColor(branch.color));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="branch-legend-heading">
        {branchLegendHeading(colored.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Colors for the branches on the tree.{" "}
        <Link href="/tree" className="text-seal">
          The tree
        </Link>
        {" · "}
        <Link href="/branches" className="text-seal">
          Family branches
        </Link>
        {" · "}
        <Link href="/branches/uncolored" className="text-seal">
          Still uncolored
        </Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="branch-legend">
        {branches.map((branch) => (
          <li key={branch.id} className="paper-card p-5">
            <p className="flex items-center gap-3 font-display text-2xl">
              <span
                className="inline-block h-4 w-4 rounded-full border border-bark/20"
                style={{ backgroundColor: normalizeBranchColor(branch.color) || "#d8cbb8" }}
                data-testid="branch-swatch"
              />
              {branchColorLine(branch.name, branch.color)}
            </p>
            <p className="mt-2 text-bark">
              {branch.members.map((member) => member.person.displayName).join(", ") || "No one listed yet"}
            </p>
            {canWrite(ctx.role) ? <BranchColorForm branchId={branch.id} color={branch.color} /> : null}
          </li>
        ))}
        {!branches.length ? <li className="text-bark">{branchLegendHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
