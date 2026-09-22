import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLifeStory } from "@/lib/book";
import { hideEventFromViewer, hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";
import { lifePdfHeading } from "@/lib/lifePdf";

export default async function PersonLifePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      names: true,
      residences: { include: { place: true } },
      events: { include: { place: true } },
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
    },
  });
  if (!person) notFound();
  if (hideMinorDetails(ctx.role, person)) notFound();
  const hideLiving = shouldHideLivingFacts(ctx.role, person);
  const chapter = compileLifeStory({
    person,
    names: hideLiving ? [] : person.names,
    residences: hideLiving ? [] : person.residences,
    events: person.events.filter((event) => !hideEventFromViewer(ctx.role, { ...event, person })),
    letters: hideLiving
      ? []
      : person.documents
          .filter((item) => item.document.kind === "letter" || item.document.kind === "note")
          .map((item) => item.document),
    stories: [...person.storiesTold, ...person.storyLinks.map((link) => link.story)],
    style: { nameStyle: ctx.family.nameStyle, dateStyle: ctx.family.dateStyle },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="life-pdf-heading">
        {lifePdfHeading(person.displayName)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">One person’s life, ready to print or keep as a PDF.</p>
      <p className="mt-4 font-sans text-sm">
        <a href={`/api/people/${person.id}/life`} className="text-seal" data-testid="life-pdf-download">
          Download {person.displayName}’s life as a PDF
        </a>
        {" · "}
        <Link href={`/people/${person.id}`} className="text-seal">Back to the person</Link>
      </p>
      <article className="mt-10 space-y-6" data-testid="life-preview">
        {chapter.sections.map((section, index) => (
          <section key={`${chapter.id}-${index}`} className="paper-card p-5">
            <h2 className="font-display text-2xl">{section.heading}</h2>
            {section.date ? <p className="font-sans text-sm text-gold">{section.date}</p> : null}
            {section.body ? <p className="mt-2 whitespace-pre-wrap text-bark">{section.body}</p> : null}
          </section>
        ))}
      </article>
    </AppShell>
  );
}
