import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingNamedByHeading, namedByLine } from "@/lib/namedBy";

export default async function MissingNamedByPage() {
  const ctx = await requireFamily();
  const names = await prisma.personName.findMany({
    where: { familyId: ctx.family.id, namedById: null },
    include: { person: true },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-named-by-heading">
        {missingNamedByHeading(names.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-named-by-list">
        {names.map((name) => (
          <li key={name.id} className="paper-card p-5">
            <Link href={`/people/${name.personId}`} className="font-display text-2xl text-seal">
              {name.person.displayName}
            </Link>
            <p className="text-bark">{namedByLine(name.name)}</p>
          </li>
        ))}
        {!names.length ? <li className="text-bark">{missingNamedByHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
