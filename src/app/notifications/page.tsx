import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MarkRead } from "@/app/notifications/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { filterMutedNotifications } from "@/lib/noticeMute";

export default async function NotificationsPage() {
  const ctx = await requireFamily();
  const [all, mutes] = await Promise.all([
    prisma.notification.findMany({
      where: { familyId: ctx.family.id, userId: ctx.session.user.id },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.noticeMute.findMany({
      where: { familyId: ctx.family.id, userId: ctx.session.user.id },
      select: { category: true },
    }),
  ]);
  const notifications = filterMutedNotifications(
    all,
    mutes.map((row) => row.category),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="notifications-heading">Notifications</h1>
      <p className="mt-3 max-w-2xl text-bark">
        When a relative adds a person, a letter, or a photograph.{" "}
        <Link href="/notifications/muted" className="text-seal">Mute a notice category</Link>.
      </p>
      <MarkRead />
      <ol className="mt-8 space-y-3" data-testid="notifications-list">
        {notifications.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-sm text-gold">
              {item.actor.name} · {formatDate(item.createdAt)}
              {item.readAt ? "" : " · New"}
            </p>
            <Link href={item.href} className="font-display text-2xl text-seal">{item.title}</Link>
            {item.body ? <p className="text-bark">{item.body}</p> : null}
          </li>
        ))}
        {!notifications.length ? <li className="text-bark">Quiet so far. Invite a relative and they will see what you add.</li> : null}
      </ol>
    </AppShell>
  );
}
