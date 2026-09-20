import { requireUser, getMemberships } from "@/lib/family";
import { Nav } from "@/components/Nav";

export async function UserShell({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const memberships = await getMemberships(session.user.id);
  return (
    <div className="min-h-screen">
      <Nav
        userName={session.user.name}
        activeFamilyId={memberships[0]?.familyId}
        families={memberships.map((item) => ({
          id: item.family.id,
          name: item.family.name,
          role: item.role,
        }))}
      />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
