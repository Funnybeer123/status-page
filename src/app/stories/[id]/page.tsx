import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const story = await prisma.story.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      teller: true,
      people: { include: { person: true } },
      document: true,
      citations: { include: { document: true, asset: true } },
    },
  });
  if (!story) notFound();

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Story</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="story-title">{story.title}</h1>
      <p className="mt-2 text-bark">
        {formatDate(story.recordedAt, "Undated")}
        {story.teller ? (
          <>
            {" · told by "}
            <Link className="text-seal" href={`/people/${story.teller.id}`}>{story.teller.displayName}</Link>
          </>
        ) : null}
      </p>
      <article className="paper-card mt-8 whitespace-pre-wrap p-6 text-lg leading-relaxed">{story.body}</article>
      <div className="mt-8">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">People</p>
        <ul className="mt-3 flex flex-wrap gap-3">
          {story.people.map((item) => (
            <li key={item.personId}>
              <Link className="text-seal" href={`/people/${item.person.id}`}>{item.person.displayName}</Link>
            </li>
          ))}
        </ul>
      </div>
      {story.document ? (
        <p className="mt-6 font-sans text-sm text-bark">
          Also kept as a note so Ask can find it. Search or ask about the words above.
        </p>
      ) : null}
    </AppShell>
  );
}
