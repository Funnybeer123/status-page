import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { missingRelatedCardHeading } from "@/lib/relatedCard";

export default async function MissingRelatedCardPage() {
  await requireFamily();
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-related-card-heading">
        {missingRelatedCardHeading()}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/related" className="text-seal">Open how we are related</Link>
      </p>
    </AppShell>
  );
}
