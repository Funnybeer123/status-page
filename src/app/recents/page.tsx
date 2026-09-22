import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { recentsHeading, recentLine, sortRecents } from "@/lib/recents";
import { hideMinorDetails } from "@/lib/privacy";
import { formatDate } from "@/lib/dates";

export default async function RecentsPage() {
  const ctx = await requireFamily();
  const visits = await prisma.personVisit.findMany({
    where: { userId: ctx.session.user.id, familyId: ctx.family.id, person: { ...alive } },
    include: { person: true },
    orderBy: { openedAt: "desc" },
    take: 24,
  });
  const visible = sortRecents(visits).filter((visit) => !hideMinorDetails(ctx.role, visit.person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="recents-heading">
        {recentsHeading(visible.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">People you opened, most recent first.</p>
      <ul className="mt-10 space-y-3" data-testid="recents-list">
        {visible.map((visit) => (
          <li key={`${visit.userId}-${visit.personId}`} className="paper-card p-5">
            <Link href={`/people/${visit.person.id}`} className="font-display text-2xl text-seal">
              {recentLine(visit.person.displayName)}
            </Link>
            <p className="font-sans text-sm text-gold">{formatDate(visit.openedAt, "")}</p>
          </li>
        ))}
        {!visible.length ? <li className="text-bark">Open a person’s record and they will appear here.</li> : null}
      </ul>
    </AppShell>
  );
}
