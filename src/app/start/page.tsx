import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StartWizard } from "@/app/start/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { startHeading, startSteps } from "@/lib/startHere";
import { ringLabel, startRingDash, startRingHeading, startRingPercent } from "@/lib/startRing";

export default async function StartPage() {
  const ctx = await requireFamily();
  const claimedId = ctx.membership.personId;
  const [people, storyCount, photoCount] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
    claimedId
      ? prisma.story.count({
          where: {
            familyId: ctx.family.id,
            OR: [{ tellerPersonId: claimedId }, { people: { some: { personId: claimedId } } }],
          },
        })
      : Promise.resolve(0),
    claimedId
      ? prisma.asset.count({
          where: { familyId: ctx.family.id, deletedAt: null, tags: { some: { personId: claimedId } } },
        })
      : Promise.resolve(0),
  ]);
  const steps = startSteps({ claimed: Boolean(claimedId), hasStory: storyCount > 0, hasPhoto: photoCount > 0 });
  const me = people.find((person) => person.id === claimedId) ?? null;
  const percent = startRingPercent(steps);
  const dash = startRingDash(percent);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="start-heading">
        {startHeading(steps)}
      </h1>
      <div className="mt-6 flex items-center gap-4" data-testid="start-ring">
        <svg viewBox="0 0 100 100" className="h-24 w-24 text-seal" data-testid="start-ring-svg">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-bark/20" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${dash.filled} ${dash.remaining}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="56" textAnchor="middle" className="fill-ink font-sans text-[18px]">
            {percent}%
          </text>
        </svg>
        <div>
          <p className="font-display text-2xl" data-testid="start-ring-heading">
            {startRingHeading(percent)}
          </p>
          <p className="mt-1 text-bark" data-testid="start-ring-label">
            {ringLabel(steps)}
          </p>
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-bark">
        A new relative starts here: claim yourself on the tree, add one story, and upload one photograph.
        {me ? (
          <>
            {" "}
            You are <Link href={`/people/${me.id}`} className="text-seal">{me.displayName}</Link>.
          </>
        ) : null}
      </p>
      <p className="mt-2 font-sans text-sm">
        <Link href="/start/progress" className="text-seal">What you still have not done</Link>
        {" · "}
        <Link href="/start/incomplete" className="text-seal">Steps still open</Link>
      </p>
      <StartWizard
        people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        personId={claimedId}
        steps={steps}
      />
    </AppShell>
  );
}
