import { requireFamily } from "@/lib/family";
import { Nav } from "@/components/Nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const ctx = await requireFamily();
  return (
    <div className="min-h-screen">
      <Nav
        userName={ctx.session.user.name}
        activeFamilyId={ctx.family.id}
        families={ctx.memberships.map((item) => ({
          id: item.family.id,
          name: item.family.name,
          role: item.role,
        }))}
      />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
