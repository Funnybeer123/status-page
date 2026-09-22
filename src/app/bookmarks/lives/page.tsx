import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLifeBookmark, lifeBookmarksHeading } from "@/lib/lifeBookmark";
import { hideMinorDetails } from "@/lib/privacy";

export default async function LifeBookmarksPage() {
  const ctx = await requireFamily();
  const people = (await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { residences: { include: { place: true } } },
    orderBy: { displayName: "asc" },
  })).filter((person) => !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="life-bookmarks-heading">
        {lifeBookmarksHeading(people.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/bookmarks" className="text-seal">Saved people</Link>
        {" · "}
        <Link href="/bookmarks/places/missing" className="text-seal">Bookmarks without a place</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="life-bookmarks-list">
        {people.map((person) => {
          const card = compileLifeBookmark(person, person.residences);
          return (
            <li key={person.id} className="paper-card p-5">
              <Link href={`/people/${person.id}/bookmark`} className="font-display text-2xl text-seal">
                {card.heading}
              </Link>
              <p className="text-bark">{card.span}</p>
              <p className="text-bark">{card.places}</p>
            </li>
          );
        })}
        {!people.length ? <li className="text-bark">{lifeBookmarksHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
