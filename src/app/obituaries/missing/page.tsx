import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingObituaryPortraitsHeading } from "@/lib/obituaryPortrait";

export default async function MissingObituaryPortraitsPage() {
  const ctx = await requireFamily();
  const obituaries = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.obituary, deletedAt: null },
    include: { memorialPerson: true },
    orderBy: { writtenAt: "desc" },
  });
  const missing = obituaries.filter((item) => !item.memorialPersonId || !item.memorialPerson?.profileAssetId);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-obituary-heading">
        {missingObituaryPortraitsHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3">
        {missing.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href="/obituaries" className="font-display text-2xl text-seal">{item.title}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every obituary is linked to a memorial portrait.</li> : null}
      </ul>
    </AppShell>
  );
}
