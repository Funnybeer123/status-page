import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function OralPage() {
  const ctx = await requireFamily();
  const recordings = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, OR: [{ kind: "audio" }, { kind: "video" }, { mimeType: { startsWith: "audio/" } }] },
    include: { tags: { include: { person: true } } },
    orderBy: { capturedAt: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="oral-heading">Oral history</h1>
      <p className="mt-3 max-w-2xl text-bark">Recorded voices the family kept — a reel, a cassette, a phone file.</p>
      <ul className="mt-10 space-y-3" data-testid="oral-list">
        {recordings.map((asset) => (
          <li key={asset.id} className="paper-card p-5">
            <Link href={`/archive/${asset.id}`} className="font-display text-2xl text-seal">{asset.title || "A recording"}</Link>
            <p className="font-sans text-sm text-gold">{formatDate(asset.capturedAt, "Undated")}</p>
            <p className="mt-2 text-bark">{asset.tags.map((tag) => tag.person.displayName).join(" · ")}</p>
          </li>
        ))}
        {!recordings.length ? <li className="text-bark">No oral-history recordings yet.</li> : null}
      </ul>
    </AppShell>
  );
}
