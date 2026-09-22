import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PersonArchiveForms } from "@/app/people/[id]/archive";
import { MergeForm } from "@/app/people/[id]/merge";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate, lifespan } from "@/lib/dates";
import { canWrite } from "@/lib/roles";
import { hideEventFromViewer, hideResidenceForViewer, isLiving, shouldHideLivingFacts } from "@/lib/privacy";
import { placeLabel } from "@/lib/places";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [person, people, places, documents, assets] = await Promise.all([
    prisma.person.findFirst({
      where: { id, familyId: ctx.family.id },
      include: {
        tags: { include: { asset: true } },
        documents: { include: { document: true } },
        fromRels: { include: { toPerson: true } },
        toRels: { include: { fromPerson: true } },
        names: { include: { citations: { include: { document: true } } } },
        residences: { include: { place: true, citations: { include: { document: true } } } },
        events: { include: { place: true, otherPerson: true, citations: { include: { document: true } } } },
        otherEvents: { include: { place: true, person: true } },
        storiesTold: true,
        storyLinks: { include: { story: true } },
        citations: { include: { document: true, asset: true, event: true, name: true } },
      },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.place.findMany({ where: { familyId: ctx.family.id }, orderBy: { name: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: { in: ["letter", "note"] } },
      orderBy: { title: "asc" },
    }),
    prisma.asset.findMany({ where: { familyId: ctx.family.id }, orderBy: { title: "asc" } }),
  ]);
  if (!person) notFound();
  const profile = person.profileAssetId
    ? await prisma.asset.findUnique({ where: { id: person.profileAssetId } })
    : null;
  const living = isLiving(person);
  const hidden = shouldHideLivingFacts(ctx.role, person);
  if (hidden) {
    person.notes = null;
    person.birthDate = null;
    person.residences = [];
    person.citations = [];
    person.events = person.events.filter((event) => !hideEventFromViewer(ctx.role, { ...event, person }));
  }
  const letters = person.documents.filter((item) => item.document.kind !== "story");
  const stories = [
    ...person.storiesTold.map((story) => ({ id: story.id, title: story.title, recordedAt: story.recordedAt })),
    ...person.storyLinks.map((link) => ({ id: link.story.id, title: link.story.title, recordedAt: link.story.recordedAt })),
  ].filter((story, index, all) => all.findIndex((item) => item.id === story.id) === index);
  const events = [...person.events, ...person.otherEvents.filter((event) => event.personId !== person.id)]
    .filter((event) => !hideEventFromViewer(ctx.role, { ...event, person }))
    .sort((a, b) => {
      if (!a.happenedOn && !b.happenedOn) return 0;
      if (!a.happenedOn) return 1;
      if (!b.happenedOn) return -1;
      return a.happenedOn.getTime() - b.happenedOn.getTime();
    });
  const residences = hideResidenceForViewer(ctx.role, person) ? [] : person.residences;
  const citations = hidden ? [] : person.citations;

  return (
    <AppShell>
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <aside className="paper-card overflow-hidden">
          <div className="aspect-[4/5] bg-cedar/10">
            {profile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${profile.storagePath}`} alt={person.displayName} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="p-5">
            <h1 className="font-display text-3xl">{person.displayName}</h1>
            <p className="mt-2 font-sans text-sm text-bark">
              {hidden ? "Living" : lifespan(person.birthDate, person.deathDate)}
            </p>
            {person.names.length ? (
              <ul className="mt-3 space-y-1 font-sans text-sm text-bark" data-testid="person-names">
                {person.names.map((name) => (
                  <li key={name.id}>
                    <span className="uppercase tracking-wide text-gold">{name.kind}</span> {name.name}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link href={`/related?to=${person.id}`} className="mt-4 inline-block font-sans text-sm text-seal">
              How are we related?
            </Link>
            <Link href={`/timeline?personId=${person.id}`} className="mt-2 block font-sans text-sm text-seal">
              Full history on the timeline
            </Link>
            <Link href={`/book?personId=${person.id}`} className="mt-2 block font-sans text-sm text-seal">
              Printable life story
            </Link>
            <Link href={`/tree?personId=${person.id}&view=pedigree`} className="mt-2 block font-sans text-sm text-seal">
              Ancestor chart
            </Link>
            {!living ? (
              <Link href={`/people/${person.id}/memorial`} className="mt-2 block font-sans text-sm text-seal">
                Memorial page
              </Link>
            ) : null}
          </div>
        </aside>
        <section className="space-y-8">
          {hidden ? (
            <p className="paper-card p-4 font-sans text-sm text-bark" data-testid="living-privacy-note">
              Some dates, notes, and places are hidden because this person is living. Contributors and owners still see the full record.
            </p>
          ) : null}
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Dates</p>
            <p className="mt-2">
              {hidden
                ? "Living — birth date withheld"
                : `Born ${formatDate(person.birthDate, "unknown")}${person.deathDate ? ` · Died ${formatDate(person.deathDate)}` : living ? " · Living" : ""}`}
            </p>
          </div>
          {!hidden && person.notes ? (
            <div>
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Notes</p>
              <p className="mt-2 max-w-2xl text-lg leading-relaxed">{person.notes}</p>
            </div>
          ) : null}
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Places lived</p>
            <ul className="mt-3 space-y-2" data-testid="person-residences">
              {residences.map((item) => (
                <li key={item.id}>
                  {placeLabel(item.place)}
                  <span className="ml-2 font-sans text-sm text-bark">
                    {formatDate(item.startedAt, "")}
                    {item.endedAt ? ` – ${formatDate(item.endedAt)}` : item.startedAt ? " – " : ""}
                  </span>
                  {item.notes ? <span className="block text-bark">{item.notes}</span> : null}
                </li>
              ))}
              {!residences.length ? (
                <li className="text-bark">{hidden ? "Places are hidden for living people." : "None recorded yet."}</li>
              ) : null}
            </ul>
          </div>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Life events</p>
            <ol className="mt-3 space-y-3">
              {events.map((event) => (
                <li key={event.id} id={`event-${event.id}`}>
                  <span className="font-sans text-xs uppercase tracking-wide text-gold">{event.kind}</span>
                  <span className="ml-2">{event.title}</span>
                  <span className="ml-2 font-sans text-sm text-bark">
                    {formatDate(event.happenedOn, "Date unknown")}
                    {event.place ? ` · ${event.place.name}` : ""}
                    {"otherPerson" in event && event.otherPerson ? ` · ${event.otherPerson.displayName}` : ""}
                    {"person" in event && event.person && event.personId !== person.id ? ` · ${event.person.displayName}` : ""}
                  </span>
                  {event.summary ? <p className="text-bark">{event.summary}</p> : null}
                </li>
              ))}
              {!events.length ? <li className="text-bark">None yet.</li> : null}
            </ol>
          </div>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Family</p>
            <ul className="mt-3 space-y-2">
              {person.fromRels.map((rel) => (
                <li key={rel.id}>
                  {rel.type === "parent" ? "Parent of" : "Partner of"}{" "}
                  <Link className="text-seal" href={`/people/${rel.toPerson.id}`}>{rel.toPerson.displayName}</Link>
                </li>
              ))}
              {person.toRels.map((rel) => (
                <li key={rel.id}>
                  {rel.type === "parent" ? "Child of" : "Partner of"}{" "}
                  <Link className="text-seal" href={`/people/${rel.fromPerson.id}`}>{rel.fromPerson.displayName}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Stories</p>
            <ul className="mt-3 space-y-2">
              {stories.map((story) => (
                <li key={story.id}>
                  <Link className="text-seal" href={`/stories/${story.id}`}>{story.title}</Link>
                  <span className="ml-2 font-sans text-xs text-bark">{formatDate(story.recordedAt, "")}</span>
                </li>
              ))}
              {!stories.length ? <li className="text-bark">None linked yet.</li> : null}
            </ul>
          </div>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Sources</p>
            <ul className="mt-3 space-y-2" data-testid="person-citations">
              {citations.map((citation) => (
                <li key={citation.id}>
                  {citation.claim}
                  {citation.document ? (
                    <>
                      {" — "}
                      <Link className="text-seal" href={`/letters/${citation.document.id}`}>{citation.document.title}</Link>
                    </>
                  ) : null}
                  {citation.pageNote ? <span className="font-sans text-sm text-bark"> ({citation.pageNote})</span> : null}
                </li>
              ))}
              {!citations.length ? <li className="text-bark">{hidden ? "Sources on living facts are hidden." : "None yet."}</li> : null}
            </ul>
          </div>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Letters and notes</p>
            <ul className="mt-3 space-y-2">
              {letters.map((item) => (
                <li key={item.documentId}>
                  <Link className="text-seal" href={`/letters/${item.documentId}`}>{item.document.title}</Link>
                  <span className="ml-2 font-sans text-xs text-bark">{formatDate(item.document.writtenAt, "")}</span>
                </li>
              ))}
              {!letters.length ? <li className="text-bark">None linked yet.</li> : null}
            </ul>
          </div>
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">In the archive</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {person.tags.map((tag) => (
                <Link key={tag.id} href={`/archive/${tag.asset.id}`} className="paper-card overflow-hidden">
                  {tag.asset.mimeType.startsWith("video/") ? (
                    <video src={`/api/media/${tag.asset.storagePath}`} className="aspect-square w-full object-cover" />
                  ) : tag.asset.mimeType.startsWith("audio/") ? (
                    <div className="flex aspect-square items-center justify-center bg-cedar/10 p-4 font-sans text-sm text-bark">Oral history</div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/media/${tag.asset.storagePath}`} alt={tag.asset.title ?? ""} className="aspect-square w-full object-cover" />
                  )}
                  <p className="p-3 text-sm">{tag.asset.title}</p>
                </Link>
              ))}
            </div>
          </div>
          {canWrite(ctx.role) ? (
            <MergeForm
              keepId={person.id}
              people={people.map((item) => ({ id: item.id, displayName: item.displayName }))}
            />
          ) : null}
          {canWrite(ctx.role) ? (
            <PersonArchiveForms
              personId={person.id}
              people={people.map((item) => ({ id: item.id, displayName: item.displayName }))}
              places={places.map((item) => ({ id: item.id, name: item.name }))}
              documents={documents.map((item) => ({ id: item.id, title: item.title }))}
              assets={assets.map((item) => ({ id: item.id, title: item.title || "Untitled" }))}
              events={person.events.map((item) => ({ id: item.id, title: item.title }))}
              names={person.names.map((item) => ({ id: item.id, name: item.name }))}
            />
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
