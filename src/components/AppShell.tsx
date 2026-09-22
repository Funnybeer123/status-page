import { requireFamily } from "@/lib/family";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const ctx = await requireFamily();
  const unread = await prisma.notification.count({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id, readAt: null },
  });
  return (
    <div className="min-h-screen">
      <Nav
        userName={ctx.session.user.name}
        activeFamilyId={ctx.family.id}
        unread={unread}
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
