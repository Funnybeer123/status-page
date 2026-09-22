import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { buildPortraitWall, missingPortraitsHeading } from "@/lib/portraits";
import { hideMinorDetails } from "@/lib/privacy";

export default async function MissingPortraitsPage() {
  const ctx = await requireFamily();
  const [people, relationships, tags] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.personTag.findMany({
      where: { person: { familyId: ctx.family.id }, asset: { deletedAt: null, kind: "photo" } },
    }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const wall = buildPortraitWall(
    visible.map((person) => ({ ...person, profileUrl: null })),
    relationships,
    tags,
    new Map(),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-portraits-heading">
        {missingPortraitsHeading(wall.missing.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        People who still need a portrait photograph.{" "}
        <Link href="/portraits" className="text-seal">Portrait wall</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="missing-portraits-list">
        {wall.missing.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
          </li>
        ))}
        {!wall.missing.length ? <li className="text-bark">Everyone has a portrait.</li> : null}
      </ul>
    </AppShell>
  );
}
