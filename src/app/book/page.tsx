import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLifeStory } from "@/lib/book";
import { hideEventFromViewer, shouldHideLivingFacts } from "@/lib/privacy";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id },
    include: {
      names: true,
      residences: { include: { place: true } },
      events: { include: { place: true } },
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
    },
    orderBy: { displayName: "asc" },
  });
  const selected = params.personId ? people.filter((person) => person.id === params.personId) : people;
  const chapters = selected
    .filter((person) => !shouldHideLivingFacts(ctx.role, person) || params.personId)
    .map((person) =>
      compileLifeStory({
        person,
        names: person.names,
        residences: shouldHideLivingFacts(ctx.role, person) ? [] : person.residences,
        events: person.events.filter((event) => !hideEventFromViewer(ctx.role, { ...event, person })),
        letters: person.documents
          .filter((item) => item.document.kind === "letter" || item.document.kind === "note")
          .map((item) => item.document),
        stories: [
          ...person.storiesTold,
          ...person.storyLinks.map((link) => link.story),
        ],
      }),
    );

  return (
    <AppShell>
      <div className="print:hidden">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
        <h1 className="mt-2 font-display text-4xl" data-testid="book-heading">Family book</h1>
        <p className="mt-3 max-w-2xl text-bark">
          A printable life story from the facts, letters, and stories already in the archive.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/book" className="rounded-full border border-bark/15 px-3 py-1 font-sans text-sm">Whole family</Link>
          {people.map((person) => (
            <Link key={person.id} href={`/book?personId=${person.id}`} className="rounded-full border border-bark/15 px-3 py-1 font-sans text-sm">
              {person.displayName}
            </Link>
          ))}
        </div>
      </div>
      <article className="mt-10 space-y-12" data-testid="book-chapters">
        {chapters.map((chapter) => (
          <section key={chapter.id} className="break-inside-avoid">
            <h2 className="font-display text-4xl">{chapter.title}</h2>
            {chapter.subtitle ? <p className="mt-1 font-sans text-sm text-gold">{chapter.subtitle}</p> : null}
            {chapter.sections.map((section, index) => (
              <div key={`${chapter.id}-${index}`} className="mt-6">
                <h3 className="font-display text-2xl">{section.heading}</h3>
                {section.date ? <p className="font-sans text-sm text-gold">{section.date}</p> : null}
                {section.body ? <p className="mt-2 whitespace-pre-wrap text-bark">{section.body}</p> : null}
              </div>
            ))}
          </section>
        ))}
      </article>
    </AppShell>
  );
}
