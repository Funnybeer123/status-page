import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TranscribeForm } from "@/app/oral/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";
import { SpokenByForm } from "@/app/family-hour/ui";
import { spokenByLine } from "@/lib/spokenBy";

export default async function OralPage() {
  const ctx = await requireFamily();
  const [recordings, people] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, OR: [{ kind: "audio" }, { kind: "video" }, { mimeType: { startsWith: "audio/" } }] },
      include: { tags: { include: { person: true } }, document: true, spokenBy: true, uploadedBy: { select: { name: true } } },
      orderBy: { capturedAt: "asc" },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="oral-heading">Oral history</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Recorded voices the family kept. Write what you hear so Ask can find it.{" "}
        <Link href="/oral/playlist" className="text-seal">Playlist</Link>
        {" · "}
        <Link href="/oral/credits" className="text-seal">Spoken-by credits</Link>
        {" · "}
        <Link href="/oral/uncredited" className="text-seal">Still uncredited</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="oral-list">
        {recordings.map((asset) => (
          <li key={asset.id} className="paper-card p-5">
            <Link href={`/archive/${asset.id}`} className="font-display text-2xl text-seal">{asset.title || "A recording"}</Link>
            <p className="font-sans text-sm text-gold">{formatDate(asset.capturedAt, "Undated")}</p>
            <p className="mt-2 text-bark">{asset.tags.map((tag) => tag.person.displayName).join(" · ")}</p>
            <p className="mt-1 font-sans text-sm text-gold" data-testid="spoken-by">
              {spokenByLine(asset.spokenBy?.displayName, asset.uploadedBy.name)}
            </p>
            {canWrite(ctx.role) ? (
              <SpokenByForm
                assetId={asset.id}
                personId={asset.spokenById}
                people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
              />
            ) : null}
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
