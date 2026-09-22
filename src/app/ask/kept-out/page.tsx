import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { keepOutHeading, keepOutLine } from "@/lib/keepOut";

export default async function KeptOutPage() {
  const ctx = await requireFamily();
  const [stories, letters, journals] = await Promise.all([
    prisma.story.findMany({
      where: { familyId: ctx.family.id, keepOutOfAsk: true },
      orderBy: { title: "asc" },
    }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, keepOutOfAsk: true, kind: { not: "story" }, deletedAt: null },
      orderBy: { title: "asc" },
    }),
    prisma.journalEntry.findMany({
      where: { familyId: ctx.family.id, authorId: ctx.session.user.id, keepOutOfAsk: true },
      orderBy: { title: "asc" },
    }),
  ]);
  const count = stories.length + letters.length + journals.length;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="kept-out-heading">
        {keepOutHeading(count)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Ask will skip these when someone asks a question.</p>
      <ul className="mt-10 space-y-3" data-testid="kept-out-list">
        {stories.map((story) => (
          <li key={story.id} className="paper-card p-5">
            <Link href={`/stories/${story.id}`} className="font-display text-2xl text-seal">{story.title}</Link>
            <p className="text-bark">{keepOutLine(story.title, true)}</p>
          </li>
        ))}
        {letters.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}`} className="font-display text-2xl text-seal">{letter.title}</Link>
            <p className="text-bark">{keepOutLine(letter.title, true)}</p>
          </li>
        ))}
        {journals.map((entry) => (
          <li key={entry.id} className="paper-card p-5">
            <p className="font-display text-2xl">{entry.title}</p>
            <p className="text-bark">{keepOutLine(entry.title, true)}</p>
          </li>
        ))}
        {!count ? <li className="text-bark">Ask can read every story, letter, and journal.</li> : null}
      </ul>
    </AppShell>
  );
}
