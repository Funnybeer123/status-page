import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { shareOpenLine, shareOpensHeading } from "@/lib/shareRevoke";

export default async function ShareOpensPage({
  searchParams,
}: {
  searchParams: Promise<{ linkId?: string; token?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const link = await prisma.shareLink.findFirst({
    where: {
      familyId: ctx.family.id,
      ...(params.linkId ? { id: params.linkId } : {}),
      ...(params.token ? { token: params.token } : {}),
    },
  });
  const opens = link
    ? await prisma.shareLinkOpen.findMany({
        where: { shareLinkId: link.id },
        include: { user: { select: { name: true } } },
        orderBy: { openedAt: "desc" },
      })
    : [];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="share-opens-heading">
        {shareOpensHeading(opens.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="share-opens-list">
        {opens.map((open) => (
          <li key={open.id} className="paper-card p-5">
            <p className="font-display text-2xl">{shareOpenLine({ name: open.user?.name, userAgent: open.userAgent })}</p>
            <p className="font-sans text-sm text-bark">{formatDate(open.openedAt)}</p>
          </li>
        ))}
        {!opens.length ? <li className="text-bark">No one has opened this share link yet.</li> : null}
      </ul>
    </AppShell>
  );
}
