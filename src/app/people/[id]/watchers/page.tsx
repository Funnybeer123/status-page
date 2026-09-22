import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { watchersHeading } from "@/lib/bookmarks";

export default async function PersonWatchersPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, ...alive },
  });
  if (!person) notFound();
  const [bookmarks, follows] = await Promise.all([
    prisma.personBookmark.findMany({
      where: { personId: person.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.personFollow.findMany({
      where: { personId: person.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{person.displayName}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="watchers-heading">
        {watchersHeading(bookmarks.length, follows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Relatives who bookmarked this person, and relatives who asked for a notice when a story, photograph, or letter is added.{" "}
        <Link href={`/people/${person.id}`} className="text-seal">Back to the person</Link>.
      </p>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Bookmarks</h2>
        <ul className="mt-4 space-y-3" data-testid="watchers-bookmarks">
          {bookmarks.map((item) => (
            <li key={item.userId} className="paper-card p-5">
              {item.user.name}
            </li>
          ))}
          {!bookmarks.length ? <li className="text-bark">No bookmarks yet.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Following</h2>
        <ul className="mt-4 space-y-3" data-testid="watchers-follows">
          {follows.map((item) => (
            <li key={item.userId} className="paper-card p-5">
              {item.user.name}
            </li>
          ))}
          {!follows.length ? <li className="text-bark">No one is following yet.</li> : null}
        </ul>
      </section>
    </AppShell>
  );
}
