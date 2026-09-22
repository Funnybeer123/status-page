import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate, lifespan } from "@/lib/dates";
import { compileLifeStory } from "@/lib/book";
import { isLiving } from "@/lib/privacy";

export default async function MemorialPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      names: true,
      residences: { include: { place: true } },
      events: { include: { place: true } },
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
      tags: { include: { asset: true } },
    },
  });
  if (!person || isLiving(person)) notFound();
  const chapter = compileLifeStory({
    person,
    names: person.names,
    residences: person.residences,
    events: person.events,
    letters: person.documents.map((item) => item.document),
    stories: [...person.storiesTold, ...person.storyLinks.map((link) => link.story)],
  });
  const burial = person.events.filter((event) => event.kind === "burial" || event.kind === "death");
  const photos = person.tags.filter((tag) => tag.asset.kind === "photo" || tag.asset.mimeType.startsWith("image/"));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">In memory</p>
      <h1 className="mt-2 font-display text-5xl" data-testid="memorial-heading">{person.displayName}</h1>
      <p className="mt-3 text-xl text-bark">{lifespan(person.birthDate, person.deathDate)}</p>
      <p className="mt-2 font-sans text-sm text-gold">Died {formatDate(person.deathDate)}</p>
      {burial.length ? (
        <ul className="mt-8 space-y-2">
          {burial.map((event) => (
            <li key={event.id} className="paper-card p-4">
              <p className="font-display text-2xl">{event.title}</p>
              <p className="text-bark">{formatDate(event.happenedOn, "")}{event.place ? ` · ${event.place.name}` : ""}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {photos.slice(0, 6).map((tag) => (
          <Link key={tag.id} href={`/archive/${tag.asset.id}`} className="paper-card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/media/${tag.asset.storagePath}`} alt={tag.asset.title ?? ""} className="aspect-square w-full object-cover" />
          </Link>
        ))}
      </div>
      <article className="mt-10 space-y-6" data-testid="memorial-story">
        {chapter.sections.map((section, index) => (
          <section key={`${chapter.id}-${index}`}>
            <h2 className="font-display text-2xl">{section.heading}</h2>
            {section.body ? <p className="mt-2 whitespace-pre-wrap text-bark">{section.body}</p> : null}
          </section>
        ))}
      </article>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/people/${person.id}`} className="text-seal">Back to the record</Link>
        {" · "}
        <Link href={`/book?personId=${person.id}`} className="text-seal">Printable life story</Link>
      </p>
    </AppShell>
  );
}
