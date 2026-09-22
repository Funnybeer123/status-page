import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { isOralHistory, oralPlaylistHeading, playlistLine, sortOralPlaylist } from "@/lib/oralPlaylist";

export default async function OralPlaylistPage() {
  const ctx = await requireFamily();
  const recordings = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { tags: { include: { person: true } } },
  });
  const items = sortOralPlaylist(recordings.filter(isOralHistory));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="oral-playlist-heading">{oralPlaylistHeading(items.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        A family playlist of oral histories, oldest first.{" "}
        <Link href="/oral" className="text-seal">The oral-history page</Link>.
      </p>
      <ol className="mt-10 space-y-3" data-testid="oral-playlist">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={`/archive/${item.id}`} className="font-display text-2xl text-seal">{item.title || "A recording"}</Link>
            <p className="font-sans text-sm text-gold">{playlistLine(item.title, formatDate(item.capturedAt, "Undated"))}</p>
            <p className="mt-2 text-bark">{item.tags.map((tag) => tag.person.displayName).join(" · ")}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">No oral histories in the playlist yet.</li> : null}
      </ol>
    </AppShell>
  );
}
