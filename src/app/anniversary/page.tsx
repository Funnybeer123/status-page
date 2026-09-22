import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { anniversaryHeading, anniversaryLine, yearsSinceFirstUpload } from "@/lib/anniversary";
import { formatDate } from "@/lib/dates";

export default async function AnniversaryPage() {
  const ctx = await requireFamily();
  const first = await prisma.asset.findFirst({
    where: { familyId: ctx.family.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const years = yearsSinceFirstUpload(first?.createdAt);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="anniversary-heading">
        {anniversaryHeading(years)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Years since the first photograph or letter entered the archive — not the family’s founding date.{" "}
        <Link href="/anniversary/empty" className="text-seal">Before the first upload</Link>
      </p>
      <p className="mt-8 font-display text-3xl" data-testid="anniversary-line">
        {anniversaryLine(years, first?.createdAt)}
      </p>
      {first ? (
        <p className="mt-3 text-bark">
          First upload {formatDate(first.createdAt)}
          {first.title ? ` · ${first.title}` : ""}
        </p>
      ) : null}
      <CiteBlock title={anniversaryHeading(years)} path="/anniversary" />
    </AppShell>
  );
}
