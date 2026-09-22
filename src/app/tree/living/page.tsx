import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TreeView } from "@/components/TreeView";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { redactPeople } from "@/lib/privacy";
import { livingPeople, livingRelationships, livingTreeHeading } from "@/lib/livingTree";

export default async function LivingTreePage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const visiblePeople = livingPeople(people);
  const visibleRels = livingRelationships(people, relationships);
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
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="living-tree-heading">
        {livingTreeHeading(treePeople.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Only people still living, for a reunion namelist or a hall display.{" "}
        <Link href="/tree" className="text-seal">The full tree</Link>
        {" · "}
        <Link href="/tree/when" className="text-seal">Who was alive when</Link>.
      </p>
      <div className="mt-10" data-testid="living-tree">
        <TreeView people={treePeople} relationships={visibleRels} />
      </div>
    </AppShell>
  );
}
