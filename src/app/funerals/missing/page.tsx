import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingFuneralPortraitHeading } from "@/lib/funeral";
import { portraitAssetId } from "@/lib/portraits";
import { isLiving } from "@/lib/privacy";

export default async function MissingFuneralPortraitsPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, deathDate: { not: null } },
    include: { tags: true },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter((person) => !isLiving(person) && !portraitAssetId(person, person.tags));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-funeral-portrait-heading">
        {missingFuneralPortraitHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-funeral-portraits">
        {missing.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}`} className="font-display text-2xl text-seal">{person.displayName}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every funeral program already has a portrait.</li> : null}
      </ul>
    </AppShell>
  );
}
