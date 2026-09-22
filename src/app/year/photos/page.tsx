import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileThisYear, yearbookHeading } from "@/lib/thisYear";
import { hidePhotoFromAudience } from "@/lib/privacy";

export default async function YearbookPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const ctx = await requireFamily();
  const year = Number.parseInt((await searchParams).year || "", 10) || new Date().getUTCFullYear();
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
    include: { tags: { include: { person: true } } },
    orderBy: { capturedAt: "asc" },
  });
  const visible = photos.filter((photo) => !hidePhotoFromAudience(ctx.role, photo.tags.map((tag) => tag.person)));
  const items = compileThisYear({
    year,
    people: [],
    stories: [],
    photos: visible,
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="yearbook-heading">{yearbookHeading(year, items.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">Photographs taken in {year} — a yearbook from the archive.</p>
      <ul className="mt-10 space-y-3" data-testid="yearbook-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={item.href} className="font-display text-2xl text-seal">{item.title}</Link>
          </li>
        ))}
        {!items.length ? <li className="text-bark">No photographs from {year} yet.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/year?year=${year}`} className="text-seal">This year in the family</Link>
      </p>
    </AppShell>
  );
}
