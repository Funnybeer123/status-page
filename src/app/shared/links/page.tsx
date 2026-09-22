import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { shareLinksHeading, shareRevokeHeading } from "@/lib/shareRevoke";
import { RevokeShareButton } from "@/app/follow/ui";

export default async function ShareLinksPage() {
  const ctx = await requireFamily();
  const links = await prisma.shareLink.findMany({
    where: { familyId: ctx.family.id },
    include: { _count: { select: { opens: true } } },
    orderBy: { createdAt: "desc" },
  });
  const active = links.filter((link) => !link.revokedAt).length;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="share-links-heading">
        {shareLinksHeading(active, links.length - active)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Revoke a memorial or album link so it stops working. See who opened it.</p>
      <ul className="mt-10 space-y-3" data-testid="share-links-list">
        {links.map((link) => (
          <li key={link.id} className="paper-card p-5">
            <p className="font-display text-2xl">{link.kind}</p>
            <p className="font-sans text-sm text-bark" data-testid={`share-status-${link.token}`}>
              {shareRevokeHeading(Boolean(link.revokedAt))}
            </p>
            <p className="mt-2 font-sans text-sm">
              <Link href={`/s/${link.token}`} className="text-seal">/s/{link.token}</Link>
              {" · "}
              <Link href={`/shared/opens?linkId=${link.id}`} className="text-seal">
                {link._count.opens} opened
              </Link>
            </p>
            {canWrite(ctx.role) && !link.revokedAt ? <RevokeShareButton token={link.token} revoked={false} /> : null}
            {link.revokedAt ? <p className="mt-2 font-sans text-sm text-gold">This share link no longer works</p> : null}
          </li>
        ))}
        {!links.length ? <li className="text-bark">No share links yet.</li> : null}
      </ul>
    </AppShell>
  );
}
