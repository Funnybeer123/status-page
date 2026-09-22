import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isOralHistory } from "@/lib/oralPlaylist";
import { uncreditedOralHeading } from "@/lib/spokenBy";

export default async function UncreditedOralPage() {
  const ctx = await requireFamily();
  const recordings = (await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    orderBy: { title: "asc" },
  })).filter((asset) => isOralHistory(asset) && !asset.spokenById);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="uncredited-oral-heading">
        {uncreditedOralHeading(recordings.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/oral" className="text-seal">Oral history</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="uncredited-oral-list">
        {recordings.map((asset) => (
          <li key={asset.id} className="paper-card p-5">
            <Link href={`/archive/${asset.id}`} className="font-display text-2xl text-seal">
              {asset.title || "A recording"}
            </Link>
          </li>
        ))}
        {!recordings.length ? <li className="text-bark">{uncreditedOralHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
