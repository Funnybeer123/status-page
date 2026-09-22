import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { remainingSteps, startSteps } from "@/lib/startHere";
import { incompleteStartHeading } from "@/lib/startRing";

export default async function IncompleteStartPage() {
  const ctx = await requireFamily();
  const claimedId = ctx.membership.personId;
  const [storyCount, photoCount] = await Promise.all([
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
  const left = remainingSteps(startSteps({ claimed: Boolean(claimedId), hasStory: storyCount > 0, hasPhoto: photoCount > 0 }));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="incomplete-start-heading">
        {incompleteStartHeading(left.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/start" className="text-seal">Start here</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="incomplete-start-list">
        {left.map((step) => (
          <li key={step.id} className="paper-card p-5">
            <Link href={step.href} className="font-display text-2xl text-seal">
              {step.title}
            </Link>
          </li>
        ))}
        {!left.length ? <li className="text-bark">{incompleteStartHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
