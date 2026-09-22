import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyScrapbookHeading } from "@/lib/scrapbook";

export default async function EmptyScrapbookPage() {
  const ctx = await requireFamily();
  const count = await prisma.lifeEvent.count({
    where: { familyId: ctx.family.id, firstTag: { not: null } },
  });
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-scrapbook-heading">
        {count ? `${count} firsts are already in the scrapbook` : emptyScrapbookHeading()}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/scrapbook" className="text-seal">Open the scrapbook</Link>
      </p>
      <p className="mt-8 text-bark" data-testid="empty-scrapbook">
        {count ? "The scrapbook already has a first house, car, or child." : emptyScrapbookHeading()}
      </p>
    </AppShell>
  );
}
