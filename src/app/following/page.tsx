import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { followHeading, followLine } from "@/lib/follows";

export default async function FollowingPage() {
  const ctx = await requireFamily();
  const follows = await prisma.personFollow.findMany({
    where: { userId: ctx.session.user.id, person: { familyId: ctx.family.id, ...alive } },
    include: { person: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="following-heading">
        {followHeading(follows.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        When someone adds a story, photograph, or letter about them, you get a notice.{" "}
        <Link href="/following/new" className="text-seal">What is new about them</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="following-list">
        {follows.map((item) => (
          <li key={`${item.userId}-${item.personId}`} className="paper-card p-5">
            <Link href={`/people/${item.person.id}`} className="font-display text-2xl text-seal">
              {followLine(item.person.displayName)}
            </Link>
          </li>
        ))}
        {!follows.length ? <li className="text-bark">Follow someone from their page.</li> : null}
      </ul>
    </AppShell>
  );
}
