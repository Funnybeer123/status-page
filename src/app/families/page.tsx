import { UserShell } from "@/components/UserShell";
import { getFamilyContext } from "@/lib/family";
import { FamiliesClient } from "@/app/families/ui";

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const ctx = await getFamilyContext();
  const { invite } = await searchParams;
  return (
    <UserShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Households</p>
      <h1 className="mt-2 font-display text-4xl">Your families</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Each family has a private tree and archive. Switch families from the header, or accept an invite.
      </p>
      <FamiliesClient
        invite={invite ?? ""}
        memberships={ctx.memberships.map((item) => ({
          id: item.family.id,
          name: item.family.name,
          role: item.role,
        }))}
      />
    </UserShell>
  );
}
