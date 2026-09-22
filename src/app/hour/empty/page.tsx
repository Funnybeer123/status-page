import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { emptyHourHeading } from "@/lib/familyHour";

export default async function EmptyHourPage() {
  await requireFamily();
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-hour-heading">
        {emptyHourHeading()}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/hour" className="text-seal">Family hour</Link>
      </p>
    </AppShell>
  );
}
