import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingBiblePagesHeading } from "@/lib/biblePage";

export default async function MissingBiblePagesPage() {
  const ctx = await requireFamily();
  const records = await prisma.bibleRecord.findMany({
    where: { familyId: ctx.family.id, assetId: null },
    include: { holder: true },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-bible-heading">
        {missingBiblePagesHeading(records.length)}
      </h1>
      <ul className="mt-10 space-y-3">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href="/bibles" className="font-display text-2xl text-seal">{row.title}</Link>
            <p className="text-bark">{row.holder?.displayName || "Family Bible"}</p>
          </li>
        ))}
        {!records.length ? <li className="text-bark">Every Bible record has its page image.</li> : null}
      </ul>
    </AppShell>
  );
}
