import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StartWizard } from "@/app/start/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { startHeading, startSteps } from "@/lib/startHere";

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
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="start-heading">
        {startHeading(steps)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A new relative starts here: claim yourself on the tree, add one story, and upload one photograph.
        {me ? (
          <>
            {" "}
            You are <Link href={`/people/${me.id}`} className="text-seal">{me.displayName}</Link>.
          </>
        ) : null}
      </p>
      <StartWizard
        people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        personId={claimedId}
        steps={steps}
      />
    </AppShell>
  );
}
