import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { emptyMysteryHeading } from "@/lib/photoMystery";

export default async function EmptyMysteryPage() {
  await requireFamily();
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-mystery-heading">
        {emptyMysteryHeading()}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/mystery" className="text-seal">Photo mystery queue</Link>
      </p>
    </AppShell>
  );
}
