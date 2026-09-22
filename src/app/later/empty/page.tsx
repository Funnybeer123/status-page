import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { emptyShelfHeading } from "@/lib/readLater";

export default async function EmptyShelfPage() {
  await requireFamily();
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-shelf-heading">
        {emptyShelfHeading()}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/later" className="text-seal">Read later</Link>
      </p>
    </AppShell>
  );
}
