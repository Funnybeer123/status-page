import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TimelineAddEvent } from "@/app/timeline/add";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";
import { buildTimelineRows, familyHistory } from "@/lib/timeline";

function midpoint(after?: string, before?: string) {
  if (after && before) {
    const mid = new Date((new Date(after).getTime() + new Date(before).getTime()) / 2);
    if (!Number.isNaN(mid.getTime())) return mid.toISOString().slice(0, 10);
  }
  return after || "";
}

function chipClass(active: boolean) {
  return `rounded-full px-3 py-1 font-sans text-sm ${active ? "bg-seal text-cream" : "border border-bark/15 hover:border-seal"}`;
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string; generation?: string; after?: string; before?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const generation = params.generation != null && params.generation !== "" ? Number(params.generation) : null;
  const history = await familyHistory(ctx.family.id, ctx.role, {
    personId: params.personId,
    generation: generation != null && !Number.isNaN(generation) ? generation : null,
  });
  const places = await prisma.place.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { name: "asc" },
  });
  const rows = buildTimelineRows(history.entries, history.gaps);
  const query = (next: { personId?: string; generation?: string | number | null }) => {
    const search = new URLSearchParams();
    const personId = next.personId === undefined ? params.personId : next.personId;
    const gen = next.generation === undefined ? params.generation : next.generation;
    if (personId) search.set("personId", personId);
    if (gen != null && gen !== "") search.set("generation", String(gen));
    const text = search.toString();
    return text ? `/timeline?${text}` : "/timeline";
  };

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="timeline-heading">Family history</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Every vital, move, marriage, letter, photograph, film, story, and oral note, in the order they happened.
      </p>
      <p className="mt-4 font-sans text-sm text-bark" data-testid="timeline-counts">
        {[
          history.counts.events ? `${history.counts.events} events` : null,
          history.counts.letters ? `${history.counts.letters} letters` : null,
          history.counts.notes ? `${history.counts.notes} notes` : null,
          history.counts.photos ? `${history.counts.photos} photographs` : null,
          history.counts.videos ? `${history.counts.videos} films` : null,
          history.counts.stories ? `${history.counts.stories} stories` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Nothing dated yet"}
        {history.gaps.length ? ` · ${history.gaps.length} ${history.gaps.length === 1 ? "gap" : "gaps"}` : ""}
      </p>

      <div className="mt-8 space-y-4" data-testid="timeline-filters">
        <div className="flex flex-wrap gap-2">
          <Link href={query({ personId: "" })} className={chipClass(!params.personId)}>All people</Link>
          {history.people.map((person) => (
            <Link key={person.id} href={query({ personId: person.id })} className={chipClass(params.personId === person.id)}>
              {person.displayName}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={query({ generation: "" })} className={chipClass(generation == null || Number.isNaN(generation))}>
            All generations
          </Link>
          {history.generations.map((item) => (
            <Link
              key={item.generation}
              href={query({ generation: item.generation })}
              className={chipClass(generation === item.generation)}
              data-testid={`timeline-gen-${item.generation}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {history.missing.length ? (
        <section className="paper-card mt-8 p-5" data-testid="timeline-missing">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Still missing</p>
          <ul className="mt-3 space-y-2">
            {history.missing.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="text-seal">{item.title}</Link>
                <span className="ml-2 font-sans text-sm text-bark">{item.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canWrite(ctx.role) ? (
        <TimelineAddEvent
          people={history.people}
          places={places.map((place) => ({ id: place.id, name: place.name }))}
          defaultPersonId={params.personId}
          defaultDate={midpoint(params.after, params.before)}
        />
      ) : null}

      <ol className="mt-10 space-y-5" data-testid="timeline-rows">
        {rows.map((row) => {
          if (row.type === "decade") {
            return (
              <li key={`decade-${row.label}`} className="pt-4">
                <h2 className="font-display text-3xl text-gold">{row.label}</h2>
              </li>
            );
          }
          if (row.type === "gap") {
            const gapParams = new URLSearchParams();
            if (params.personId) gapParams.set("personId", params.personId);
            if (generation != null && !Number.isNaN(generation)) gapParams.set("generation", String(generation));
            gapParams.set("after", row.gap.after);
            gapParams.set("before", row.gap.before);
            const addHref = `/timeline?${gapParams.toString()}#add-event`;
            return (
              <li key={row.gap.id} className="grid gap-3 sm:grid-cols-[8rem_1fr]" data-testid="timeline-gap">
                <p className="font-sans text-sm text-gold">Gap</p>
                <article className="border border-dashed border-gold/50 bg-cream/60 p-5">
                  <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Silent stretch</p>
                  <h3 className="mt-2 font-display text-2xl" data-testid="timeline-gap-title">
                    {row.gap.title}
                  </h3>
                  <p className="mt-2 text-bark">{row.gap.summary}</p>
                  {canWrite(ctx.role) ? (
                    <Link href={addHref} className="mt-3 inline-block font-sans text-sm text-seal" data-testid="timeline-gap-add">
                      Add what happened
                    </Link>
                  ) : null}
                </article>
              </li>
            );
          }
          const entry = row.entry;
          return (
            <li
              key={`${entry.source}-${entry.id}`}
              id={entry.source === "event" ? `event-${entry.id}` : `${entry.source}-${entry.id}`}
              className="grid gap-3 sm:grid-cols-[8rem_1fr]"
              data-testid="timeline-entry"
              data-source={entry.source}
            >
              <time className="font-sans text-sm text-gold">{entry.happenedOn ? formatDate(entry.happenedOn) : "Undated"}</time>
              <article className="paper-card overflow-hidden p-5">
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
                  {entry.kind}
                  {entry.place ? ` · ${entry.place}` : ""}
                </p>
                <h3 className="mt-2 font-display text-2xl">
                  <Link href={entry.href} className="hover:text-seal">{entry.title}</Link>
                </h3>
                {entry.summary ? <p className="mt-2 text-bark">{entry.summary}</p> : null}
                {entry.mediaUrl ? (
                  entry.mimeType?.startsWith("video/") ? (
                    <video controls src={entry.mediaUrl} className="mt-4 aspect-video w-full bg-cedar object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.mediaUrl} alt={entry.title} className="mt-4 max-h-72 w-full object-cover" />
                  )
                ) : null}
                <p className="mt-3 font-sans text-sm text-bark">
                  {entry.people.map((person) => person.displayName).join(", ")}
                </p>
              </article>
            </li>
          );
        })}
        {!rows.length ? <li className="text-bark">Nothing on the history yet. Add a person, a letter, or a missing event.</li> : null}
      </ol>
    </AppShell>
  );
}
