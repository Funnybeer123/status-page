import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isOralHistory, undatedOralHeading } from "@/lib/oralPlaylist";

export default async function UndatedOralPage() {
  const ctx = await requireFamily();
  const recordings = await prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: null } });
  const undated = recordings.filter((item) => isOralHistory(item) && !item.capturedAt);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="undated-oral-heading">{undatedOralHeading(undated.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="undated-oral">
        {undated.map((item) => (
          <li key={item.id}>
            <Link href={`/archive/${item.id}`} className="text-seal">{item.title || "A recording"}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
