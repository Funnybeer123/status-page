import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { normalizeBranchColor, uncoloredBranchesHeading } from "@/lib/branchColor";

export default async function UncoloredBranchesPage() {
  const ctx = await requireFamily();
  const branches = await prisma.familyBranch.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { name: "asc" },
  });
  const missing = branches.filter((branch) => !normalizeBranchColor(branch.color));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="uncolored-branches-heading">
        {uncoloredBranchesHeading(missing.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="uncolored-branches">
        {missing.map((branch) => (
          <li key={branch.id} className="paper-card p-4">
            <Link href="/branches/legend" className="font-display text-xl text-seal">
              {branch.name}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{uncoloredBranchesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
