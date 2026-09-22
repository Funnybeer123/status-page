import { AppShell } from "@/components/AppShell";
import { ResearcherInviteForm } from "@/app/follow/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canInvite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { inviteExpired, researcherInviteHeading, researcherInviteLine } from "@/lib/researcherInvite";

export default async function ResearcherInvitePage() {
  const ctx = await requireFamily();
  const invites = await prisma.invite.findMany({
    where: { familyId: ctx.family.id, purpose: "researcher" },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="researcher-heading">
        {researcherInviteHeading(invites.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        A guest researcher joins as a viewer. The invite stops working on the date you choose.
      </p>
      {canInvite(ctx.role) ? (
        <ResearcherInviteForm />
      ) : (
        <p className="mt-6 text-bark">Only an owner can invite a guest researcher.</p>
      )}
      <ul className="mt-10 space-y-3" data-testid="researcher-list">
        {invites.map((invite) => (
          <li key={invite.id} className="paper-card p-5">
            <p className="font-display text-2xl">{researcherInviteLine(invite.email, invite.expiresAt)}</p>
            <p className="font-sans text-sm text-bark">
              {inviteExpired(invite.expiresAt) ? "Expired" : `Expires ${formatDate(invite.expiresAt)}`} · viewer
            </p>
          </li>
        ))}
        {!invites.length ? <li className="text-bark">No guest-researcher invites yet.</li> : null}
      </ul>
    </AppShell>
  );
}
