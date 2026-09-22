import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileFamilyFirsts } from "@/lib/familyFirsts";

export default async function FirstsPage() {
  const ctx = await requireFamily();
  const [people, relationships, events, letters, photos] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.lifeEvent.findMany({ where: { familyId: ctx.family.id } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: { in: ["letter", "note"] }, deletedAt: null },
      select: { id: true, title: true, writtenAt: true },
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
      select: { id: true, title: true, capturedAt: true },
    }),
  ]);
  const firsts = compileFamilyFirsts({ people, relationships, events, letters, photos });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="firsts-heading">Family firsts</h1>
      <p className="mt-3 max-w-2xl text-bark">The earliest birth, wedding, letter, and photograph the archive still holds.</p>
      <ul className="mt-10 space-y-3" data-testid="firsts-list">
        {firsts.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">{item.title}</p>
            <Link href={item.href} className="font-display text-2xl text-seal">{item.name}</Link>
            {item.when ? <p className="text-bark">{item.when}</p> : null}
          </li>
        ))}
        {!firsts.length ? <li className="text-bark">Add a person or a letter first.</li> : null}
      </ul>
    </AppShell>
  );
}
