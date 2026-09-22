import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { emptyPhotoDuplicatesHeading } from "@/lib/photoDuplicates";

export default async function EmptyPhotoDuplicatesPage() {
  await requireFamily();
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-photo-duplicates-heading">
        {emptyPhotoDuplicatesHeading()}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/photos/duplicates" className="text-seal">Duplicate photographs</Link>
      </p>
    </AppShell>
  );
}
