import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { TreeView } from "@/components/TreeView";
import { YearSlider } from "@/app/alive-when/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { redactPeople } from "@/lib/privacy";
import { aliveWhenHeading, highlightAliveIds, parseAliveYear } from "@/lib/aliveWhen";

export default async function AliveWhenPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const year = parseAliveYear(params.year);
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
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
  const highlightIds = highlightAliveIds(treePeople, year);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="alive-when-heading">
        {aliveWhenHeading(year, highlightIds.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Slide to a year. People who were alive then stay bright on the tree.{" "}
        <Link href="/tree" className="text-seal">The tree</Link>
        {" · "}
        <Link href="/tree/living" className="text-seal">Living tree</Link>
        {" · "}
        <Link href={`/tree/when/died?year=${year}`} className="text-seal">Who died that year</Link>
        {" · "}
        <Link href={`/tree/when/born?year=${year}`} className="text-seal">Who was born that year</Link>
        {" · "}
        <Link href="/tree/when/missing" className="text-seal">Missing birth years</Link>
      </p>
      <YearSlider year={year} />
      <div className="mt-10" data-testid="alive-when-tree">
        <TreeView people={treePeople} relationships={relationships} highlightIds={highlightIds} />
      </div>
      <CiteBlock title={aliveWhenHeading(year, highlightIds.length)} path={`/tree/when?year=${year}`} />
    </AppShell>
  );
}
