import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { deedHeading, missingDeedsHeading } from "@/lib/deed";

export default async function MissingDeedsPage() {
  const ctx = await requireFamily();
  const records = await prisma.landRecord.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
    orderBy: { title: "asc" },
  });
  const missing = records.filter((row) => !row.assetId);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-deeds-heading">
        {missingDeedsHeading(missing.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Land records that still need a deed image.{" "}
        <Link href="/land" className="text-seal">Land records</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="missing-deeds-list">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href="/land" className="font-display text-2xl text-seal">
              {deedHeading(row.title)}
            </Link>
            <p className="text-bark">{row.person.displayName}</p>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every land abstract has its deed image.</li> : null}
      </ul>
    </AppShell>
  );
}
