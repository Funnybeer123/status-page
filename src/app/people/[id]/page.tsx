import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PersonArchiveForms } from "@/app/people/[id]/archive";
import { MergeForm } from "@/app/people/[id]/merge";
import { FamilyLinksForm } from "@/app/people/[id]/family";
import { TrashRestore } from "@/app/trash/ui";
import { ShareLinkButton } from "@/app/share/ui";
import { BookmarkButton, FollowButton } from "@/app/follow/ui";
import { childMarks, isPartnerRel } from "@/lib/rels";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { ageLabel, formatDate, lifespan } from "@/lib/dates";
import { dateRange, rangeBarStyle } from "@/lib/dateRange";
import { PersonDetailsForm } from "@/app/people/[id]/details";
import { canWrite } from "@/lib/roles";
import { canSeeOwnerNote, hideEventFromViewer, hideMinorDetails, hidePhotoFromAudience, hideResidenceForViewer, isLiving, shouldHideLivingFacts } from "@/lib/privacy";
import { PersonSearchForm } from "@/app/people/search-form";
import { OwnerNoteForm } from "@/app/people/owner-note";
import { chapterHeading, compileLifeChapters } from "@/lib/chapters";
import { childPublicName } from "@/lib/children";
import { qualityLabel } from "@/lib/sourceQuality";
import { placeLabel } from "@/lib/places";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [person, people, places, documents, assets] = await Promise.all([
    prisma.person.findFirst({
      where: { id, familyId: ctx.family.id, deletedAt: null },
      include: {
        tags: { include: { asset: { include: { tags: { include: { person: true } } } } } },
        documents: { include: { document: true } },
        fromRels: { include: { toPerson: true } },
        toRels: { include: { fromPerson: true } },
        names: { include: { citations: { include: { document: true } } } },
        residences: { include: { place: true, citations: { include: { document: true } } } },
        events: { include: { place: true, otherPerson: true, citations: { include: { document: true } }, witnesses: { include: { person: true } } } },
        otherEvents: { include: { place: true, person: true } },
        storiesTold: true,
        storyLinks: { include: { story: true } },
        citations: { include: { document: true, asset: true, event: true, name: true } },
        handwritingSamples: { include: { document: true, asset: true } },
        lifeChapters: true,
      },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.place.findMany({ where: { familyId: ctx.family.id }, orderBy: { name: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: { in: ["letter", "note"] }, deletedAt: null },
      orderBy: { title: "asc" },
    }),
    prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { title: "asc" } }),
  ]);
  if (!person) notFound();
  await prisma.personVisit.upsert({
    where: { userId_personId: { userId: ctx.session.user.id, personId: person.id } },
    create: { userId: ctx.session.user.id, personId: person.id, familyId: ctx.family.id },
    update: { openedAt: new Date() },
  });
  const [bookmarked, following] = await Promise.all([
    prisma.personBookmark.findUnique({
      where: { userId_personId: { userId: ctx.session.user.id, personId: person.id } },
    }),
    prisma.personFollow.findUnique({
      where: { userId_personId: { userId: ctx.session.user.id, personId: person.id } },
    }),
  ]);
  const profile = person.profileAssetId
    ? await prisma.asset.findUnique({ where: { id: person.profileAssetId } })
    : null;
  const living = isLiving(person);
  const hidden = shouldHideLivingFacts(ctx.role, person);
  const hideChild = hideMinorDetails(ctx.role, person);
  if (hidden) {
    person.notes = null;
    person.birthDate = null;
    person.residences = [];
    person.citations = [];
    person.events = person.events.filter((event) => !hideEventFromViewer(ctx.role, { ...event, person }));
  }
  if (hideChild) {
    person.notes = null;
    person.birthDate = null;
    person.tags = [];
    person.documents = [];
    person.citations = [];
    person.storiesTold = [];
    person.storyLinks = [];
    person.lifeChapters = [];
    person.ownerNote = null;
  }
  if (!canSeeOwnerNote(ctx.role)) {
    person.ownerNote = null;
  }
  const letters = hideChild
    ? []
    : person.documents.filter((item) => item.document.kind !== "story" && !item.document.deletedAt);
  const stories = hideChild
    ? []
    : [
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
  const citations = hidden || hideChild ? [] : person.citations;
  const archiveTags = hideChild
    ? []
    : person.tags.filter(
        (tag) => !tag.asset.deletedAt && !hidePhotoFromAudience(ctx.role, tag.asset.tags.map((item) => item.person)),
      );
  const showProfile = profile && !hideChild;
  const chapters = hideChild
    ? []
    : compileLifeChapters({
        birthDate: hidden ? null : person.birthDate,
        deathDate: person.deathDate,
        named: person.lifeChapters,
        items: [
          ...stories.map((story) => ({
            id: story.id,
            kind: "story" as const,
            title: story.title,
            happenedOn: story.recordedAt,
            href: `/stories/${story.id}`,
          })),
          ...letters.map((item) => ({
            id: item.document.id,
            kind: "letter" as const,
            title: item.document.title,
            happenedOn: item.document.writtenAt,
            href: `/letters/${item.document.id}`,
          })),
          ...archiveTags.map((tag) => ({
            id: tag.asset.id,
            kind: "photo" as const,
            title: tag.asset.title || "Photograph",
            happenedOn: tag.asset.capturedAt,
            href: `/archive/${tag.asset.id}`,
          })),
        ],
      });

  return (
    <AppShell>
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <aside className="paper-card overflow-hidden">
          <div className="aspect-[4/5] bg-cedar/10">
            {showProfile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${profile.storagePath}`} alt={person.displayName} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="p-5">
            <h1 className="font-display text-3xl">{hideChild ? childPublicName(person) : person.displayName}</h1>
            <p className="mt-2 font-sans text-sm text-bark">
              {hideChild || hidden ? "Living" : lifespan(person.birthDate, person.deathDate)}
            </p>
            {!hideChild && person.pronunciation ? (
              <p className="mt-2 font-sans text-sm text-gold" data-testid="person-pronunciation">
                Said {person.pronunciation}
              </p>
            ) : null}
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
            <Link href={`/people/${person.id}/descendants`} className="mt-2 block font-sans text-sm text-seal">
              Descendants and ahnentafel
            </Link>
            <Link href={`/shared?from=${person.id}`} className="mt-2 block font-sans text-sm text-seal">
              Shared ancestors
            </Link>
            <Link href={`/map?personId=${person.id}`} className="mt-2 block font-sans text-sm text-seal">
              Migration path
            </Link>
            <Link href={`/compare?from=${person.id}`} className="mt-2 block font-sans text-sm text-seal">
              Compare lives
            </Link>
            <Link href={`/people/${person.id}/history`} className="mt-2 block font-sans text-sm text-seal">
              Edit history
            </Link>
            <Link href={`/group-sheets/${person.id}`} className="mt-2 block font-sans text-sm text-seal">
              Family group sheet
            </Link>
            <Link href={`/people/${person.id}/report`} className="mt-2 block font-sans text-sm text-seal">
              Descendant report
            </Link>
            {!hideChild ? (
              <Link href={`/people/${person.id}/packet`} className="mt-2 block font-sans text-sm text-seal" data-testid="packet-link">
                Person packet
              </Link>
            ) : null}
            {!hideChild ? (
              <Link href={`/people/${person.id}/chapters`} className="mt-2 block font-sans text-sm text-seal" data-testid="chapters-link">
                Life chapters
              </Link>
            ) : null}
            {!hideChild ? (
              <Link href={`/people/${person.id}/read`} className="mt-2 block font-sans text-sm text-seal" data-testid="life-reading-link">
                Read this life
              </Link>
            ) : null}
            {!hideChild ? (
              <Link href={`/people/${person.id}/search`} className="mt-2 block font-sans text-sm text-seal" data-testid="person-search-link">
                Search this life
              </Link>
            ) : null}
            {!hideChild ? (
              <Link href={`/people/${person.id}/life`} className="mt-2 block font-sans text-sm text-seal" data-testid="life-pdf-link">
                PDF of this life
              </Link>
            ) : null}
            <Link href={`/people/${person.id}/occupations`} className="mt-2 block font-sans text-sm text-seal" data-testid="occupations-link">
              Occupation timeline
            </Link>
            <Link href={`/people/${person.id}/watchers`} className="mt-2 block font-sans text-sm text-seal" data-testid="watchers-link">
              Who is watching
            </Link>
            <Link href="/handwriting" className="mt-2 block font-sans text-sm text-seal">
              Handwriting
            </Link>
            {childMarks(person.id, [...person.fromRels, ...person.toRels]).length ? (
              <p className="mt-3 font-sans text-xs uppercase tracking-wide text-gold">
                {childMarks(person.id, [...person.fromRels, ...person.toRels]).join(" · ")}
              </p>
            ) : null}
            {!living ? (
              <>
                <Link href={`/people/${person.id}/memorial`} className="mt-2 block font-sans text-sm text-seal">
                  Memorial page
                </Link>
                <Link href={`/people/${person.id}/funeral`} className="mt-2 block font-sans text-sm text-seal">
                  Funeral program
                </Link>
              </>
            ) : null}
            <Link href={`/life-drafts/${person.id}`} className="mt-2 block font-sans text-sm text-seal">
              Life story draft
            </Link>
          </div>
        </aside>
        <section className="space-y-8">
          {hideChild ? (
            <p className="paper-card p-4 font-sans text-sm text-bark" data-testid="child-privacy-note">
              Living children are hidden from viewers and share links. Contributors and owners still see the full record.
            </p>
          ) : hidden ? (
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
          {canSeeOwnerNote(ctx.role) && person.ownerNote ? (
            <div data-testid="owner-note">
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Owner-only note</p>
              <p className="mt-2 max-w-2xl text-lg leading-relaxed">{person.ownerNote}</p>
            </div>
          ) : null}
          {!hideChild ? <PersonSearchForm personId={person.id} /> : null}
          {!hidden && (person.causeOfDeath || person.languages || person.burialPlot) ? (
            <div data-testid="person-later-facts">
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Later facts</p>
              {person.causeOfDeath ? <p className="mt-2">Cause of death · {person.causeOfDeath}</p> : null}
              {person.languages ? <p className="mt-1">Languages · {person.languages}</p> : null}
              {person.burialPlot ? <p className="mt-1">Burial plot · {person.burialPlot}</p> : null}
            </div>
          ) : null}
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Places lived</p>
            <ul className="mt-3 space-y-2" data-testid="person-residences">
              {residences.map((item) => (
                <li key={item.id}>
                  <Link href={`/places/${item.placeId}`} className="text-seal">{placeLabel(item.place)}</Link>
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
                    {dateRange(
                      event.happenedOn,
                      "precision" in event ? event.precision : null,
                      "rangeEnd" in event ? event.rangeEnd : null,
                    ).label}
                    {ageLabel(person.birthDate, event.happenedOn) ? ` · ${ageLabel(person.birthDate, event.happenedOn)}` : ""}
                    {event.place ? ` · ${event.place.name}` : ""}
                    {"otherPerson" in event && event.otherPerson ? ` · ${event.otherPerson.displayName}` : ""}
                    {"person" in event && event.person && event.personId !== person.id ? ` · ${event.person.displayName}` : ""}
                  </span>
                  {("precision" in event && event.precision !== "exact") || ("rangeEnd" in event && event.rangeEnd) ? (
                    <div className="relative mt-1 h-2 w-full max-w-md bg-bark/10">
                      <div
                        className="absolute h-2 bg-gold/70"
                        style={rangeBarStyle(
                          dateRange(
                            event.happenedOn,
                            "precision" in event ? event.precision : null,
                            "rangeEnd" in event ? event.rangeEnd : null,
                          ),
                          1900,
                          2030,
                        )}
                        data-testid="date-range-bar"
                      />
                    </div>
                  ) : null}
                  {event.summary ? <p className="text-bark">{event.summary}</p> : null}
                  {"witnesses" in event && event.witnesses?.length ? (
                    <p className="font-sans text-sm text-gold">
                      {event.witnesses.map((item) => `${item.role} ${item.person.displayName}`).join(" · ")}
                    </p>
                  ) : null}
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
                  {rel.type === "parent"
                    ? "Parent of"
                    : rel.type === "adoptive"
                      ? "Adoptive parent of"
                      : rel.type === "step"
                        ? "Step-parent of"
                        : rel.endedKind
                          ? `${rel.endedKind === "divorce" ? "Former partner of" : "Separated from"}`
                          : "Partner of"}{" "}
                  <Link className="text-seal" href={`/people/${rel.toPerson.id}`}>{rel.toPerson.displayName}</Link>
                </li>
              ))}
              {person.toRels.map((rel) => (
                <li key={rel.id}>
                  {rel.type === "parent"
                    ? "Child of"
                    : rel.type === "adoptive"
                      ? "Adopted child of"
                      : rel.type === "step"
                        ? "Stepchild of"
                        : rel.endedKind
                          ? `${rel.endedKind === "divorce" ? "Former partner of" : "Separated from"}`
                          : "Partner of"}{" "}
                  <Link className="text-seal" href={`/people/${rel.fromPerson.id}`}>{rel.fromPerson.displayName}</Link>
                </li>
              ))}
            </ul>
          </div>
          {!hideChild ? (
            <div data-testid="person-chapters">
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Life chapters</p>
              <ul className="mt-3 space-y-2">
                {chapters.map((chapter) => (
                  <li key={chapter.id}>
                    <Link href={`/people/${person.id}/chapters`} className="text-seal">{chapterHeading(chapter)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
                  {citation.quality ? <span className="ml-2 font-sans text-xs uppercase tracking-wide text-gold">{qualityLabel(citation.quality)}</span> : null}
                </li>
              ))}
              {!citations.length ? <li className="text-bark">{hidden ? "Sources on living facts are hidden." : "None yet."}</li> : null}
            </ul>
          </div>
          {person.handwritingSamples.length ? (
            <div data-testid="person-handwriting">
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Handwriting</p>
              <ul className="mt-3 space-y-2">
                {person.handwritingSamples.map((sample) => (
                  <li key={sample.id}>
                    {sample.document ? (
                      <Link className="text-seal" href={`/letters/${sample.document.id}`}>{sample.document.title}</Link>
                    ) : (
                      <span>A sample of their hand</span>
                    )}
                    {sample.notes ? <span className="ml-2 font-sans text-sm text-bark">{sample.notes}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
              {archiveTags.map((tag) => (
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
            <FamilyLinksForm
              personId={person.id}
              people={people.map((item) => ({ id: item.id, displayName: item.displayName }))}
              partners={[
                ...person.fromRels
                  .filter((rel) => isPartnerRel(rel.type) && !rel.endedAt)
                  .map((rel) => ({ id: rel.id, name: rel.toPerson.displayName })),
                ...person.toRels
                  .filter((rel) => isPartnerRel(rel.type) && !rel.endedAt)
                  .map((rel) => ({ id: rel.id, name: rel.fromPerson.displayName })),
              ]}
            />
          ) : null}
          <BookmarkButton personId={person.id} bookmarked={Boolean(bookmarked)} />
          <FollowButton personId={person.id} following={Boolean(following)} muted={Boolean(following?.mutedAt)} />
          {canWrite(ctx.role) && !living ? <ShareLinkButton kind="memorial" entityId={person.id} /> : null}
          {canWrite(ctx.role) ? <TrashRestore type="person" id={person.id} /> : null}
          {canWrite(ctx.role) ? (
            <MergeForm
              keepId={person.id}
              people={people.map((item) => ({ id: item.id, displayName: item.displayName }))}
            />
          ) : null}
          {canWrite(ctx.role) ? (
            <PersonDetailsForm
              personId={person.id}
              causeOfDeath={person.causeOfDeath || ""}
              languages={person.languages || ""}
              burialPlot={person.burialPlot || ""}
              pronunciation={person.pronunciation || ""}
            />
          ) : null}
          {canSeeOwnerNote(ctx.role) ? (
            <OwnerNoteForm personId={person.id} ownerNote={person.ownerNote || ""} />
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
