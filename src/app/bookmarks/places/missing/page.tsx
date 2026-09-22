import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingBookmarkPlacesHeading } from "@/lib/lifeBookmark";
import { hideMinorDetails } from "@/lib/privacy";

export default async function MissingBookmarkPlacesPage() {
  const ctx = await requireFamily();
  const people = (await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { residences: true },
    orderBy: { displayName: "asc" },
  })).filter((person) => !person.residences.length && !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-bookmark-places-heading">
        {missingBookmarkPlacesHeading(people.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/bookmarks/lives" className="text-seal">Life bookmarks</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="missing-bookmark-places-list">
        {people.map((person) => (
          <li key={person.id} className="paper-card p-5">
            <Link href={`/people/${person.id}/bookmark`} className="font-display text-2xl text-seal">
              {person.displayName}
            </Link>
          </li>
        ))}
        {!people.length ? <li className="text-bark">{missingBookmarkPlacesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
