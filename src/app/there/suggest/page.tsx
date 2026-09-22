import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { thereSuggestHeading, suggestThere } from "@/lib/yearExtras";

export default async function ThereSuggestPage() {
  const ctx = await requireFamily();
  const claimedId = ctx.membership.personId;
  const [events, marked] = await Promise.all([
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
      orderBy: { happenedOn: "desc" },
    }),
    claimedId
      ? prisma.eventWitness.findMany({
          where: { familyId: ctx.family.id, personId: claimedId, role: "there" },
        })
      : Promise.resolve([]),
  ]);
  const suggestions = suggestThere(events, marked.map((row) => row.eventId));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="there-suggest-heading">{thereSuggestHeading(suggestions.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Family events you have not yet marked “I was there.”
        {!claimedId ? " Claim yourself first." : ""}
      </p>
      <ul className="mt-10 space-y-3" data-testid="there-suggest-list">
        {suggestions.map((event) => (
          <li key={event.id} className="paper-card p-5">
            <p className="font-display text-2xl">{event.title}</p>
            <p className="font-sans text-sm text-gold">{formatDate(event.happenedOn, "")}</p>
            <p className="mt-2">
              <Link href={`/people/${event.personId}`} className="text-seal">{event.person.displayName}</Link>
              {" · "}
              <Link href="/there" className="text-seal">I was there</Link>
            </p>
          </li>
        ))}
        {!suggestions.length ? <li className="text-bark">Every family event has been marked.</li> : null}
      </ul>
    </AppShell>
  );
}
