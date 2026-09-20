import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TreeView } from "@/components/TreeView";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { redactPeople } from "@/lib/privacy";

export default async function TreePage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const assets = await prisma.asset.findMany({
    where: { id: { in: people.map((person) => person.profileAssetId).filter(Boolean) as string[] } },
  });
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const treePeople = redactPeople(people, ctx.role).map((person) => ({
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
          <p className="mt-3 max-w-xl text-bark">Open anyone for names, places, a timeline, and letters. Add people and parent or partner links as you learn them.</p>
        </div>
        {canWrite(ctx.role) ? (
          <Link href="/people/new" className="rounded-full bg-seal px-5 py-2 font-sans text-sm text-cream">
            Add a person
          </Link>
        ) : null}
      </div>
      <div className="mt-10">
        <TreeView people={treePeople} relationships={relationships} />
      </div>
    </AppShell>
  );
}
