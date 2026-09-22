import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TreeView } from "@/components/TreeView";
import { PedigreeView } from "@/components/PedigreeView";
import { buildPedigree } from "@/lib/pedigree";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { redactPeople } from "@/lib/privacy";
import { memberIdsForBranch, peopleInBranch, relationshipsInBranch } from "@/lib/branches";

export default async function TreePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; personId?: string; branchId?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const [people, relationships, branches] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.familyBranch.findMany({
      where: { familyId: ctx.family.id },
      include: { members: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const memberIds = memberIdsForBranch(branches, params.branchId);
  const visiblePeople = peopleInBranch(people, memberIds);
  const visibleRels = relationshipsInBranch(relationships, memberIds);
  const assets = await prisma.asset.findMany({
    where: { id: { in: visiblePeople.map((person) => person.profileAssetId).filter(Boolean) as string[] } },
  });
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const treePeople = redactPeople(visiblePeople, ctx.role).map((person) => ({
    ...person,
    profileUrl: person.profileAssetId
      ? `/api/media/${assetById.get(person.profileAssetId)?.storagePath ?? ""}`
      : null,
  }));

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
          <h1 className="mt-2 font-display text-4xl" data-testid="tree-heading">The tree</h1>
          <p className="mt-3 max-w-xl text-bark">Open anyone for names, places, a timeline, and letters. Switch to the ancestor chart to walk parents and grandparents.</p>
        </div>
        {canWrite(ctx.role) ? (
          <Link href="/people/new" className="rounded-full bg-seal px-5 py-2 font-sans text-sm text-cream">
            Add a person
          </Link>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-2 font-sans text-sm">
        <Link href="/tree" className={`rounded-full px-3 py-1 ${!params.view ? "bg-seal text-cream" : "border border-bark/15"}`}>Generations</Link>
        <Link href="/tree?view=pedigree" className={`rounded-full px-3 py-1 ${params.view === "pedigree" ? "bg-seal text-cream" : "border border-bark/15"}`}>Ancestor chart</Link>
        <Link href="/surnames" className="rounded-full border border-bark/15 px-3 py-1">Surnames</Link>
        <Link href="/places" className="rounded-full border border-bark/15 px-3 py-1">Places</Link>
        <Link href="/tree" className={`rounded-full px-3 py-1 ${!params.branchId ? "bg-seal text-cream" : "border border-bark/15"}`}>All branches</Link>
        {branches.map((branch) => (
          <Link
            key={branch.id}
            href={`/tree?branchId=${branch.id}${params.view ? `&view=${params.view}` : ""}`}
            className={`rounded-full px-3 py-1 ${params.branchId === branch.id ? "bg-seal text-cream" : "border border-bark/15"}`}
            data-testid={`tree-branch-${branch.id}`}
          >
            {branch.name}
          </Link>
        ))}
      </div>
      <div className="mt-10">
        {params.view === "pedigree" ? (
          <PedigreeView
            tree={buildPedigree(
              params.personId && treePeople.some((person) => person.id === params.personId)
                ? params.personId
                : treePeople[treePeople.length - 1]?.id || "",
              treePeople,
              visibleRels,
            )}
          />
        ) : (
          <TreeView people={treePeople} relationships={visibleRels} />
        )}
      </div>
    </AppShell>
  );
}
