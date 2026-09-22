import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { attachYearCredits, compileThisYear, thisYearHeading } from "@/lib/thisYear";
import { hideEventFromViewer, hidePhotoFromAudience, shouldHideLivingFacts } from "@/lib/privacy";
import { formatDate } from "@/lib/dates";

export default async function ThisYearPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const ctx = await requireFamily();
  const year = Number.parseInt((await searchParams).year || "", 10) || new Date().getUTCFullYear();
  const [people, stories, photos, letters, events, activities] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      select: { id: true, displayName: true, birthDate: true, deathDate: true },
    }),
    prisma.story.findMany({ where: { familyId: ctx.family.id }, select: { id: true, title: true, recordedAt: true } }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
      include: { tags: { include: { person: true } } },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
      select: { id: true, title: true, writtenAt: true },
    }),
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id },
      select: { id: true, title: true, personId: true, happenedOn: true, kind: true, person: { select: { deathDate: true } } },
    }),
    prisma.activity.findMany({
      where: { familyId: ctx.family.id },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const items = attachYearCredits(
    compileThisYear({
      year,
      people: people.filter((person) => !shouldHideLivingFacts(ctx.role, person) || Boolean(person.deathDate)),
      stories,
      photos: photos.filter((photo) => !hidePhotoFromAudience(ctx.role, photo.tags.map((tag) => tag.person))),
      letters,
      events: events.filter((event) => !hideEventFromViewer(ctx.role, event)),
    }),
    activities.map((activity) => ({
      entityId: activity.entityId,
      title: activity.title,
      actorName: activity.actor.name,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="this-year-heading">{thisYearHeading(year, items.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Births, deaths, stories, and photographs from {year} — one page for the year the family is living through.</p>
      <form className="mt-6 flex flex-wrap gap-3 font-sans text-sm" action="/year">
        <input type="number" name="year" defaultValue={year} className="w-28 rounded-lg border border-bark/15 bg-paper px-3 py-2" />
        <button className="rounded-full bg-seal px-4 py-2 text-cream" type="submit">Show year</button>
      </form>
      <ul className="mt-10 space-y-3" data-testid="this-year-list">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">{item.kind}</p>
            <Link href={item.href} className="font-display text-2xl text-seal">{item.title}</Link>
            <p className="font-sans text-sm text-bark">{formatDate(item.date, "")}</p>
            {item.credit ? <p className="font-sans text-sm text-gold" data-testid="year-credit">{item.credit}</p> : null}
          </li>
        ))}
        {!items.length ? <li className="text-bark">Nothing from {year} yet.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/year/photos?year=${year}`} className="text-seal">Photographs from {year}</Link>
      </p>
    </AppShell>
  );
}
