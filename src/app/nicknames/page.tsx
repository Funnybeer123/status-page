import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function NicknamesPage() {
  const ctx = await requireFamily();
  const names = await prisma.personName.findMany({
    where: { familyId: ctx.family.id, kind: "nickname" },
    include: { person: true },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="nicknames-heading">Nicknames</h1>
      <p className="mt-3 max-w-2xl text-bark">What the family still calls them.</p>
      <ul className="mt-10 space-y-3" data-testid="nicknames-list">
        {names.map((name) => (
          <li key={name.id} className="paper-card p-5">
            <p className="font-display text-2xl">{name.name}</p>
            <Link href={`/people/${name.personId}`} className="text-seal">{name.person.displayName}</Link>
          </li>
        ))}
        {!names.length ? <li className="text-bark">No nicknames recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
