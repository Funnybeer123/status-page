import { AppShell } from "@/components/AppShell";
import { emptyAnniversaryHeading } from "@/lib/anniversary";
import { requireFamily } from "@/lib/family";

export default async function EmptyAnniversaryPage() {
  await requireFamily();
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-anniversary-heading">
        {emptyAnniversaryHeading()}
      </h1>
      <p className="mt-3 text-bark">The archive anniversary starts with the first upload.</p>
    </AppShell>
  );
}
