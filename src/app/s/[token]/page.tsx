import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, lifespan } from "@/lib/dates";
import { compileLifeStory } from "@/lib/book";

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link) notFound();

  if (link.kind === "memorial") {
    const person = await prisma.person.findFirst({
      where: { id: link.entityId, familyId: link.familyId, deletedAt: null },
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
    if (!person || !person.deathDate) notFound();
    const chapter = compileLifeStory({
      person,
      names: person.names,
      residences: person.residences,
      events: person.events,
      letters: person.documents.map((item) => item.document),
      stories: [...person.storiesTold, ...person.storyLinks.map((link) => link.story)],
    });
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Family memorial</p>
        <h1 className="mt-2 font-display text-5xl" data-testid="share-memorial">{person.displayName}</h1>
        <p className="mt-3 text-xl text-bark">{lifespan(person.birthDate, person.deathDate)}</p>
        <p className="mt-2 font-sans text-sm text-gold">Died {formatDate(person.deathDate)}</p>
        <article className="mt-10 space-y-6">
          {chapter.sections.map((section, index) => (
            <section key={`${chapter.id}-${index}`}>
              <h2 className="font-display text-2xl">{section.heading}</h2>
              {section.body ? <p className="mt-2 whitespace-pre-wrap text-bark">{section.body}</p> : null}
            </section>
          ))}
        </article>
      </main>
    );
  }

  const album = await prisma.album.findFirst({
    where: { id: link.entityId, familyId: link.familyId },
    include: { items: { include: { asset: true, document: true, story: true } } },
  });
  if (!album) notFound();
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Family album</p>
      <h1 className="mt-2 font-display text-5xl" data-testid="share-album">{album.title}</h1>
      {album.summary ? <p className="mt-3 text-bark">{album.summary}</p> : null}
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {album.items.map((item) => (
          <li key={item.id} className="paper-card overflow-hidden p-4">
            {item.asset ? (
              item.asset.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${item.asset.storagePath}`} alt={item.asset.title ?? ""} className="w-full" />
              ) : (
                <p>{item.asset.title}</p>
              )
            ) : item.document ? (
              <p>{item.document.title}</p>
            ) : item.story ? (
              <p>{item.story.title}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/login" className="text-seal">Sign in to the family archive</Link>
      </p>
    </main>
  );
}
