import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { bookmarkHeading, bookmarkLine } from "@/lib/bookmarks";

export default async function BookmarksPage() {
  const ctx = await requireFamily();
  const bookmarks = await prisma.personBookmark.findMany({
    where: { userId: ctx.session.user.id, person: { familyId: ctx.family.id, ...alive } },
    include: { person: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="bookmarks-heading">
        {bookmarkHeading(bookmarks.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">People you want to find again from the family home.</p>
      <ul className="mt-10 space-y-3" data-testid="bookmarks-page-list">
        {bookmarks.map((item) => (
          <li key={`${item.userId}-${item.personId}`} className="paper-card p-5">
            <Link href={`/people/${item.person.id}`} className="font-display text-2xl text-seal">
              {bookmarkLine(item.person.displayName)}
            </Link>
          </li>
        ))}
        {!bookmarks.length ? <li className="text-bark">Bookmark someone from their page.</li> : null}
      </ul>
    </AppShell>
  );
}
