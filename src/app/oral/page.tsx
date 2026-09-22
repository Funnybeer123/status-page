import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TranscribeForm } from "@/app/oral/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";

export default async function OralPage() {
  const ctx = await requireFamily();
  const [recordings, people] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, OR: [{ kind: "audio" }, { kind: "video" }, { mimeType: { startsWith: "audio/" } }] },
      include: { tags: { include: { person: true } }, document: true },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="oral-heading">Oral history</h1>
      <p className="mt-3 max-w-2xl text-bark">Recorded voices the family kept. Write what you hear so Ask can find it.</p>
      <ul className="mt-10 space-y-3" data-testid="oral-list">
        {recordings.map((asset) => (
          <li key={asset.id} className="paper-card p-5">
            <Link href={`/archive/${asset.id}`} className="font-display text-2xl text-seal">{asset.title || "A recording"}</Link>
            <p className="font-sans text-sm text-gold">{formatDate(asset.capturedAt, "Undated")}</p>
            <p className="mt-2 text-bark">{asset.tags.map((tag) => tag.person.displayName).join(" · ")}</p>
            {asset.document ? (
              <p className="mt-2 text-bark" data-testid="oral-transcript">
                {asset.document.transcript.slice(0, 280)}
              </p>
            ) : canWrite(ctx.role) ? (
              <TranscribeForm
                assetId={asset.id}
                people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
              />
            ) : null}
          </li>
        ))}
        {!recordings.length ? <li className="text-bark">No oral-history recordings yet.</li> : null}
      </ul>
    </AppShell>
  );
}
