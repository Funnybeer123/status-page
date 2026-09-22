import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { muteLine, mutedFollowsHeading } from "@/lib/follows";

export default async function MutedFollowsPage() {
  const ctx = await requireFamily();
  const follows = await prisma.personFollow.findMany({
    where: {
      userId: ctx.session.user.id,
      mutedAt: { not: null },
      person: { familyId: ctx.family.id, ...alive },
    },
    include: { person: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="muted-heading">
        {mutedFollowsHeading(follows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        You still follow them, but their notices are quiet.{" "}
        <Link href="/following" className="text-seal">Everyone you follow</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="muted-list">
        {follows.map((item) => (
          <li key={`${item.userId}-${item.personId}`} className="paper-card p-5">
            <Link href={`/people/${item.person.id}`} className="font-display text-2xl text-seal">
              {muteLine(item.person.displayName, true)}
            </Link>
          </li>
        ))}
        {!follows.length ? <li className="text-bark">No muted follows.</li> : null}
      </ul>
    </AppShell>
  );
}
