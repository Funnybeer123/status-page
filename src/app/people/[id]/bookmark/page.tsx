import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLifeBookmark } from "@/lib/lifeBookmark";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";

export default async function LifeBookmarkPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: { residences: { include: { place: true } } },
  });
  if (!person || hideMinorDetails(ctx.role, person)) notFound();
  const card = compileLifeBookmark(
    shouldHideLivingFacts(ctx.role, person) ? { ...person, birthDate: null } : person,
    person.residences,
  );
  return (
    <AppShell>
      <article className="mx-auto max-w-sm print:max-w-none paper-card p-8 text-center" data-testid="life-bookmark">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Printable bookmark</p>
        <h1 className="mt-2 font-display text-4xl" data-testid="life-bookmark-heading">
          {card.heading}
        </h1>
        <p className="mt-4 text-xl text-bark" data-testid="life-bookmark-span">
          {card.span}
        </p>
        <p className="mt-6 text-bark" data-testid="life-bookmark-places">
          {card.places}
        </p>
        <p className="mt-10 font-sans text-sm print:hidden">
          <Link href={`/people/${person.id}`} className="text-seal">The record</Link>
          {" · "}
          <Link href={`/people/${person.id}/card`} className="text-seal">Index card</Link>
          {" · "}
          <Link href="/bookmarks" className="text-seal">Saved people</Link>
          {" · "}
          <Link href="/bookmarks/lives" className="text-seal">Life bookmarks</Link>
        </p>
      </article>
      <CiteBlock title={card.heading} path={`/people/${person.id}/bookmark`} />
    </AppShell>
  );
}
