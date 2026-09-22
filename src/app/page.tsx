import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { loadFamilyReminders, loadOnThisDaySources } from "@/lib/familyDates";
import { collectOnThisDay, onThisDayHeading } from "@/lib/onThisDay";
import { activityHref } from "@/lib/activity";
import { remindersThisWeek, remindersTomorrow, tomorrowHeading } from "@/lib/reminders";
import { howRelated } from "@/lib/related";
import { alive } from "@/lib/alive";
import { canWrite } from "@/lib/roles";
import { PinMemoryForm } from "@/app/homes/pin-form";
import { compileThisWeek, thisWeekHeading, thisWeekSince } from "@/lib/thisWeek";
import { BannerForm } from "@/app/banner/ui";
import { bookmarkHomeHeading, bookmarkLine } from "@/lib/bookmarks";
import { boxHeading } from "@/lib/box";
import { recentsHeading, recentLine } from "@/lib/recents";
import { pickTodayQuestion, todayQuestionHeading, unansweredQuestionsHeading } from "@/lib/todayQuestion";
import { PromptAnswer } from "@/app/prompts/ui";
import { hideMinorDetails, redactPeople } from "@/lib/privacy";
import { filterBirthdayReminders, loadMutedCategories } from "@/lib/noticeMute";
import { homeMottoHeading, pickHomeMotto } from "@/lib/homeMotto";
import { AskBox } from "@/components/AskBox";
import { TreeView } from "@/components/TreeView";
import { quietHomeHeading } from "@/lib/quietMode";
import { nightQuietHeading } from "@/lib/nightMode";
import { GuestBookForm } from "@/app/then-now/ui";
import { emptyGuestBookHeading, guestBookHeading, guestBookLine } from "@/lib/guestBook";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="font-sans text-xs uppercase tracking-[0.28em] text-gold">A private family archive</p>
        <h1 className="mt-4 font-display text-5xl leading-tight md:text-7xl">Family Lineage</h1>
        <p className="mt-6 max-w-2xl text-xl leading-relaxed text-bark">
          Each family keeps its own tree, places, stories, and letters. Ask how the grandparents met, and the
          answer comes from their correspondence — not from the public web.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/login?demo=1" className="rounded-full bg-seal px-6 py-3 font-sans text-cream">
            Try the Hart family
          </Link>
          <Link href="/signup" className="rounded-full border border-bark/20 px-6 py-3 font-sans">
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  const ctx = await getFamilyContext();
  if (!ctx.family || !ctx.role) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl">Create a family</h1>
        <p className="mt-3 text-bark">You are signed in. Start a family or accept an invite.</p>
        <Link href="/families" className="mt-6 inline-block rounded-full bg-seal px-5 py-2 font-sans text-cream">
          Families
        </Link>
      </div>
    );
  }

  const meId = ctx.membership?.personId ?? null;
  const [{ upcoming, reminders }, sources, activities, weekActivities, mePeople, relationships, pins, pinChoices, bookmarks, boxCount, prompts, visits, mottos, quietUser, treePeople, guestNotes] = await Promise.all([
    loadFamilyReminders(ctx.family.id, ctx.role),
    loadOnThisDaySources(ctx.family.id),
    prisma.activity.findMany({
      where: { familyId: ctx.family.id },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.activity.findMany({
      where: { familyId: ctx.family.id, createdAt: { gte: thisWeekSince() } },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, select: { id: true, displayName: true } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.pinnedMemory.findMany({
      where: { familyId: ctx.family.id },
      include: { story: true, document: true, asset: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    Promise.all([
      prisma.story.findMany({ where: { familyId: ctx.family.id }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
      prisma.document.findMany({
        where: { familyId: ctx.family.id, kind: { in: ["letter", "note"] }, deletedAt: null },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
      prisma.asset.findMany({
        where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
    ]),
    prisma.personBookmark.findMany({
      where: { userId: session.user.id, person: { familyId: ctx.family.id, ...alive } },
      include: { person: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.asset.count({
      where: { familyId: ctx.family.id, deletedAt: null, tags: { none: {} } },
    }),
    prisma.storyPrompt.findMany({
      where: { familyId: ctx.family.id },
      include: { answers: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.personVisit.findMany({
      where: { userId: session.user.id, familyId: ctx.family.id, person: { ...alive } },
      include: { person: true },
      orderBy: { openedAt: "desc" },
      take: 6,
    }),
    prisma.familyMotto.findMany({ where: { familyId: ctx.family.id }, orderBy: { id: "asc" } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { quietMode: true, nightMode: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.homeGuestBook.findMany({
      where: { familyId: ctx.family.id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  const [pinStories, pinLetters, pinPhotos] = pinChoices;
  const me = mePeople.find((person) => person.id === meId) ?? null;
  const myPeople = me
    ? mePeople
        .filter((person) => person.id !== me.id)
        .map((person) => howRelated(mePeople, relationships, me.id, person.id))
        .filter((item) => item.found)
        .slice(0, 5)
    : [];
  const muted = await loadMutedCategories(ctx.family.id, session.user.id);
  const today = collectOnThisDay({ ...sources, role: ctx.role });
  const week = filterBirthdayReminders(remindersThisWeek(reminders), muted);
  const tomorrow = filterBirthdayReminders(remindersTomorrow(reminders), muted);
  const upcomingDates = filterBirthdayReminders(upcoming, muted);
  const todayQuestion = pickTodayQuestion(prompts);
  const unanswered = prompts.filter((prompt) => !prompt.answers.length);
  const recentPeople = visits.filter((visit) => !hideMinorDetails(ctx.role, visit.person));
  const homeMotto = pickHomeMotto(mottos);
  if (quietUser?.quietMode) {
    return (
      <AppShell>
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
        <h1 className="mt-2 font-display text-4xl" data-testid="dashboard-heading">Family home</h1>
        <h2 className="mt-6 font-display text-3xl" data-testid="quiet-home-heading">{quietHomeHeading()}</h2>
        {quietUser.nightMode ? (
          <h3 className="mt-4 font-display text-2xl" data-testid="night-quiet-heading">{nightQuietHeading()}</h3>
        ) : null}
        <p className="mt-3 max-w-2xl text-bark">Activity counts stay hidden. The tree and Ask are still here.</p>
        <section className="mt-8" data-testid="quiet-tree">
          <TreeView
            people={redactPeople(treePeople, ctx.role).map((person) => ({ ...person, profileUrl: null }))}
            relationships={relationships}
          />
        </section>
        <section className="mt-10" data-testid="quiet-ask">
          <h2 className="font-display text-2xl">Ask</h2>
          <div className="mt-4">
            <AskBox suggested="How did grandma meet grandpa?" />
          </div>
        </section>
      </AppShell>
    );
  }

  const thisWeek = compileThisWeek(
    weekActivities.map((item) => ({
      id: item.id,
      title: item.title,
      verb: item.verb,
      actorName: item.actor.name,
      createdAt: item.createdAt,
      href: activityHref(item.entityType, item.entityId),
    })),
  );

  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      {ctx.family.bannerText ? (
        <aside className="mt-4 paper-card p-5" data-testid="family-banner">
          <p className="font-display text-3xl">{ctx.family.bannerText}</p>
          {ctx.family.bannerNote ? <p className="mt-2 text-bark">{ctx.family.bannerNote}</p> : null}
        </aside>
      ) : null}
      <h1 className="mt-2 font-display text-4xl" data-testid="dashboard-heading">Family home</h1>
      {homeMotto ? (
        <aside className="mt-4 paper-card p-5" data-testid="home-motto">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{homeMottoHeading()}</p>
          <p className="mt-2 font-display text-3xl">{homeMotto.text}</p>
          {homeMotto.notes ? <p className="mt-2 text-bark">{homeMotto.notes}</p> : null}
        </aside>
      ) : null}
      <p className="mt-3 max-w-2xl text-bark">
        Upcoming dates, what happened on this day, and who added what.{" "}
        <Link href="/year" className="text-seal">This year in the family</Link>
        {" · "}
        <Link href="/since" className="text-seal" data-testid="home-since-visit">What changed since last visit</Link>.
        {me ? (
          <>
            {" "}You are <Link href={`/people/${me.id}`} className="text-seal" data-testid="home-me">{me.displayName}</Link>.
          </>
        ) : (
          <>
            {" "}<Link href="/me" className="text-seal">Say which person is you</Link>.
          </>
        )}
      </p>
      <section className="mt-8" data-testid="home-today-question">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">{todayQuestionHeading(todayQuestion?.title)}</h2>
          <Link href="/prompts/unanswered" className="font-sans text-sm text-seal">{unansweredQuestionsHeading(unanswered.length)}</Link>
        </div>
        {todayQuestion ? (
          <div className="mt-4 paper-card p-5">
            <p className="text-bark">{todayQuestion.body || "Answer in your own words. It will be saved as a story."}</p>
            {canWrite(ctx.role) ? <PromptAnswer promptId={todayQuestion.id} /> : null}
          </div>
        ) : (
          <p className="mt-2 text-bark">Add a family question and it will sit on the home.</p>
        )}
      </section>
      <section className="mt-8" data-testid="home-recents">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">{recentsHeading(recentPeople.length)}</h2>
          <Link href="/recents" className="font-sans text-sm text-seal">Recently opened</Link>
        </div>
        <ul className="mt-4 space-y-3" data-testid="recents-home-list">
          {recentPeople.map((visit) => (
            <li key={`${visit.userId}-${visit.personId}`} className="paper-card p-4">
              <Link href={`/people/${visit.person.id}`} className="font-display text-xl text-seal">
                {recentLine(visit.person.displayName)}
              </Link>
            </li>
          ))}
          {!recentPeople.length ? <li className="text-bark">Open a person’s record and they will stay on the family home.</li> : null}
        </ul>
      </section>
      <section className="mt-8" data-testid="home-box">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">{boxHeading(boxCount)}</h2>
          <Link href="/box" className="font-sans text-sm text-seal">Unsorted box</Link>
        </div>
        <p className="mt-2 max-w-2xl text-bark">Uploads that still need to be filed onto someone.</p>
      </section>
      <section className="mt-8" data-testid="home-bookmarks">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">{bookmarkHomeHeading(bookmarks.length)}</h2>
          <Link href="/bookmarks" className="font-sans text-sm text-seal">All bookmarks</Link>
        </div>
        <ul className="mt-4 space-y-3" data-testid="bookmarks-list">
          {bookmarks.map((item) => (
            <li key={`${item.userId}-${item.personId}`} className="paper-card p-4">
              <Link href={`/people/${item.person.id}`} className="font-display text-xl text-seal">
                {bookmarkLine(item.person.displayName)}
              </Link>
            </li>
          ))}
          {!bookmarks.length ? <li className="text-bark">Bookmark a relative and they will stay on the family home.</li> : null}
        </ul>
      </section>

      <section className="mt-8" data-testid="home-pins">
        <h2 className="font-display text-2xl">Pinned memories</h2>
        <p className="mt-2 max-w-2xl text-bark">A letter, story, or photograph kept on the family home.</p>
        <ul className="mt-4 space-y-3" data-testid="pins-list">
          {pins.map((pin) => (
            <li key={pin.id} className="paper-card p-4">
              <Link
                href={pin.storyId ? `/stories/${pin.storyId}` : pin.documentId ? `/letters/${pin.documentId}` : pin.assetId ? `/archive/${pin.assetId}` : "/"}
                className="font-display text-xl text-seal"
              >
                {pin.title}
              </Link>
              {pin.note ? <p className="text-bark">{pin.note}</p> : null}
            </li>
          ))}
          {!pins.length ? <li className="text-bark">Nothing pinned yet.</li> : null}
        </ul>
        {canWrite(ctx.role) ? (
          <PinMemoryForm stories={pinStories} documents={pinLetters} assets={pinPhotos} />
        ) : null}
        {canWrite(ctx.role) ? (
          <BannerForm bannerText={ctx.family.bannerText} bannerNote={ctx.family.bannerNote} />
        ) : null}
      </section>

      {myPeople.length ? (
        <section className="mt-8" data-testid="home-related">
          <h2 className="font-display text-2xl">How you are related</h2>
          <ul className="mt-4 space-y-2">
            {myPeople.map((item) => (
              <li key={item.toId}>
                <Link href={`/related?from=${me?.id}&to=${item.toId}`} className="text-seal">{item.sentence}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10" data-testid="tomorrow-reminder">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">{tomorrowHeading(tomorrow.length)}</h2>
          <Link href="/tomorrow" className="font-sans text-sm text-seal">Tomorrow</Link>
        </div>
        <ul className="mt-4 space-y-3" data-testid="tomorrow-home-list">
          {tomorrow.map((item) => (
            <li key={item.id} className="paper-card flex flex-wrap items-baseline justify-between gap-3 p-4">
              <Link href={`/people/${item.personId}`} className="font-display text-xl text-seal">{item.title}</Link>
              <span className="font-sans text-sm text-gold">Tomorrow</span>
            </li>
          ))}
          {!tomorrow.length ? <li className="text-bark">No family date falls tomorrow.</li> : null}
        </ul>
      </section>

      <section className="mt-10" data-testid="dashboard-dates">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Upcoming family dates</h2>
          <Link href="/dates" className="font-sans text-sm text-seal">All dates</Link>
        </div>
        <ul className="mt-4 space-y-3">
          {upcomingDates.slice(0, 6).map((item) => (
            <li key={item.id} className="paper-card flex flex-wrap items-baseline justify-between gap-3 p-4">
              <Link href={`/people/${item.personId}`} className="font-display text-xl text-seal">{item.title}</Link>
              <span className="font-sans text-sm text-gold">
                {item.daysUntil === 0 ? "Today" : item.daysUntil === 1 ? "Tomorrow" : `In ${item.daysUntil} days`}
              </span>
            </li>
          ))}
          {!upcomingDates.length ? <li className="text-bark">No dated events in the next 90 days.</li> : null}
        </ul>
        {week.length ? (
          <p className="mt-3 font-sans text-sm text-bark">{week.length} this week.</p>
        ) : null}
      </section>

      <section className="mt-10" data-testid="dashboard-today">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">On this day · {onThisDayHeading()}</h2>
          <Link href="/today" className="font-sans text-sm text-seal">The full day</Link>
        </div>
        <ul className="mt-4 space-y-3">
          {today.slice(0, 4).map((item) => (
            <li key={item.id} className="paper-card p-4">
              <Link href={item.href} className="font-display text-xl text-seal">{item.title}</Link>
              <p className="font-sans text-sm text-bark">{item.year || item.kind}</p>
            </li>
          ))}
          {!today.length ? <li className="text-bark">Nothing in the archive falls on today&apos;s month and day yet.</li> : null}
        </ul>
      </section>

      <section className="mt-10" data-testid="this-week">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">{thisWeekHeading(thisWeek.length)}</h2>
          <Link href="/week" className="font-sans text-sm text-seal">This week</Link>
        </div>
        <ul className="mt-4 space-y-3" data-testid="this-week-list">
          {thisWeek.slice(0, 8).map((item) => (
            <li key={item.id} className="paper-card p-4">
              <p className="font-sans text-sm text-gold">{item.actorName} {item.verb}</p>
              <Link href={item.href || "/activity"} className="font-display text-xl text-seal">{item.title}</Link>
            </li>
          ))}
          {!thisWeek.length ? <li className="text-bark">Nothing new in the last seven days.</li> : null}
        </ul>
      </section>

      <section className="mt-10" data-testid="home-guestbook">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">{guestNotes.length ? guestBookHeading(guestNotes.length) : emptyGuestBookHeading()}</h2>
          <Link href="/guestbook" className="font-sans text-sm text-seal">Guest book</Link>
        </div>
        <p className="mt-2 max-w-2xl text-bark">Visiting relatives leave a note on the family home.</p>
        <ul className="mt-4 space-y-3" data-testid="home-guestbook-list">
          {guestNotes.map((note) => (
            <li key={note.id} className="paper-card p-4">
              <p className="text-bark">{guestBookLine(note.author.name, note.body)}</p>
            </li>
          ))}
          {!guestNotes.length ? <li className="text-bark">{emptyGuestBookHeading()}</li> : null}
        </ul>
        <GuestBookForm />
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Recent activity</h2>
          <Link href="/activity" className="font-sans text-sm text-seal">Activity feed</Link>
        </div>
        <ul className="mt-4 space-y-3">
          {activities.map((item) => (
            <li key={item.id} className="paper-card p-4">
              <p className="font-sans text-sm text-gold">{item.actor.name} {item.verb}</p>
              <Link href={activityHref(item.entityType, item.entityId)} className="font-display text-xl text-seal">
                {item.title}
              </Link>
            </li>
          ))}
          {!activities.length ? <li className="text-bark">Nothing logged yet. Add a person, a letter, or a photograph.</li> : null}
        </ul>
      </section>
    </AppShell>
  );
}
