import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { progressHeading, progressSteps, remainingSteps } from "@/lib/startHere";

export default async function StartProgressPage() {
  const ctx = await requireFamily();
  const claimedId = ctx.membership.personId;
  const [storyCount, photoCount, thereCount] = await Promise.all([
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
    claimedId
      ? prisma.eventWitness.count({ where: { familyId: ctx.family.id, personId: claimedId, role: "there" } })
      : Promise.resolve(0),
  ]);
  const steps = progressSteps({
    claimed: Boolean(claimedId),
    hasStory: storyCount > 0,
    hasPhoto: photoCount > 0,
    hasThere: thereCount > 0,
  });
  const left = remainingSteps(steps);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="start-progress-heading">{progressHeading(steps)}</h1>
      <p className="mt-3 max-w-2xl text-bark">What that relative still has not done on the start-here list.</p>
      <ul className="mt-10 space-y-3" data-testid="start-progress-list">
        {left.map((step) => (
          <li key={step.id} className="paper-card p-5">
            <Link href={step.href} className="font-display text-2xl text-seal">{step.title}</Link>
            <p className="text-bark">Still to do</p>
          </li>
        ))}
        {!left.length ? <li className="text-bark">Nothing left on the start list.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/start" className="text-seal">Start here</Link>
      </p>
    </AppShell>
  );
}
