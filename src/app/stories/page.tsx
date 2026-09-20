import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StoryForm } from "@/app/stories/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function StoriesPage() {
  const ctx = await requireFamily();
  const [stories, people] = await Promise.all([
    prisma.story.findMany({
      where: { familyId: ctx.family.id },
      include: { teller: true, people: { include: { person: true } } },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
  ]);

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="stories-heading">Stories and oral notes</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Write the story as it was told. Ask can find these the same way it finds letters.
      </p>
      {canWrite(ctx.role) ? (
        <StoryForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-4">
        {stories.map((story) => (
          <li key={story.id} className="paper-card p-5">
            <Link href={`/stories/${story.id}`} className="font-display text-2xl text-seal">{story.title}</Link>
            <p className="mt-1 font-sans text-sm text-bark">
              {formatDate(story.recordedAt, "Undated")}
              {story.teller ? ` · told by ${story.teller.displayName}` : ""}
              {story.people.length ? ` · ${story.people.map((item) => item.person.displayName).join(", ")}` : ""}
            </p>
            <p className="mt-3 text-bark">{story.body.slice(0, 220)}{story.body.length > 220 ? "…" : ""}</p>
          </li>
        ))}
        {!stories.length ? <li className="text-bark">No stories yet. Record one the way a relative told it.</li> : null}
      </ul>
    </AppShell>
  );
}
