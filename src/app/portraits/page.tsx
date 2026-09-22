import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { buildPortraitWall, missingPortraitsHeading } from "@/lib/portraits";
import { hideMinorDetails } from "@/lib/privacy";

export default async function PortraitsPage() {
  const ctx = await requireFamily();
  const [people, relationships, tags] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.personTag.findMany({
      where: { person: { familyId: ctx.family.id }, asset: { deletedAt: null, kind: "photo" } },
      orderBy: { asset: { createdAt: "asc" } },
    }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const assetIds = [
    ...new Set(
      visible
        .map((person) => person.profileAssetId)
        .concat(tags.map((tag) => tag.assetId))
        .filter(Boolean) as string[],
    ),
  ];
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds }, familyId: ctx.family.id, deletedAt: null },
  });
  const assetPath = new Map(assets.map((asset) => [asset.id, asset.storagePath]));
  const wall = buildPortraitWall(
    visible.map((person) => ({ ...person, profileUrl: null })),
    relationships,
    tags,
    assetPath,
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="portraits-heading">
        {wall.heading}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        One photograph per person, grouped by generation.{" "}
        <Link href="/portraits/missing" className="text-seal">{missingPortraitsHeading(wall.missing.length)}</Link>.
      </p>
      {wall.rows.map((row) => (
        <section key={row.generation} className="mt-10">
          <h2 className="font-display text-2xl" data-testid={`portrait-gen-${row.generation}`}>
            {row.heading}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {row.people.map((person) => (
              <li key={person.id} className="paper-card overflow-hidden">
                <Link href={`/people/${person.id}`}>
                  {person.profileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.profileUrl} alt={person.displayName} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-paper text-bark">No portrait yet</div>
                  )}
                  <p className="p-4 font-display text-xl text-seal">{person.displayName}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </AppShell>
  );
}
